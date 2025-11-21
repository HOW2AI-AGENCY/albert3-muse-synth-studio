/**
 * Bulk Operations Utilities
 * Handles batch operations on multiple tracks
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import { logError, logInfo } from './logger';
import type { Track } from '@/types/domain/track.types';

export interface BulkOperationProgress {
  current: number;
  total: number;
  percentage: number;
}

/**
 * Download a file from URL
 */
async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    logError('Failed to download file', error as Error, 'bulkOperations', { url, filename });
    throw error;
  }
}

/**
 * Bulk download tracks
 */
export async function bulkDownloadTracks(
  trackIds: string[],
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<{ success: number; failed: number }> {
  logInfo('Starting bulk download', 'bulkOperations', { count: trackIds.length });
  
  let success = 0;
  let failed = 0;

  // Fetch track data
  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('id, title, audio_url')
    .in('id', trackIds);

  if (error || !tracks) {
    logError('Failed to fetch tracks for download', error as Error, 'bulkOperations');
    return { success: 0, failed: trackIds.length };
  }

  const total = tracks.length;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    
    try {
      if (!track.audio_url) {
        failed++;
        continue;
      }

      await downloadFile(track.audio_url, `${track.title}.mp3`);
      success++;
      
      onProgress?.({
        current: i + 1,
        total,
        percentage: Math.round(((i + 1) / total) * 100),
      });

      // Small delay to avoid overwhelming browser
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      failed++;
      logError('Failed to download track', error as Error, 'bulkOperations', { trackId: track.id });
    }
  }

  logInfo('Bulk download completed', 'bulkOperations', { success, failed });
  return { success, failed };
}

/**
 * Bulk delete tracks
 */
export async function bulkDeleteTracks(
  trackIds: string[],
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<{ success: number; failed: number }> {
  logInfo('Starting bulk delete', 'bulkOperations', { count: trackIds.length });
  
  const total = trackIds.length;
  let success = 0;
  let failed = 0;

  // Delete in batches to avoid timeout
  const batchSize = 10;
  for (let i = 0; i < trackIds.length; i += batchSize) {
    const batch = trackIds.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .in('id', batch);

      if (error) throw error;

      success += batch.length;
    } catch (error) {
      failed += batch.length;
      logError('Failed to delete batch', error as Error, 'bulkOperations', { batch });
    }

    onProgress?.({
      current: Math.min(i + batchSize, total),
      total,
      percentage: Math.round((Math.min(i + batchSize, total) / total) * 100),
    });
  }

  logInfo('Bulk delete completed', 'bulkOperations', { success, failed });
  return { success, failed };
}

/**
 * Bulk add tracks to project
 */
export async function bulkAddToProject(
  trackIds: string[],
  projectId: string,
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<{ success: number; failed: number }> {
  logInfo('Starting bulk add to project', 'bulkOperations', { count: trackIds.length, projectId });
  
  const total = trackIds.length;

  try {
    // Get existing track positions in project
    const { data: existingTracks } = await supabase
      .from('project_tracks')
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1);

    let startPosition = existingTracks?.[0]?.position ?? 0;

    // Prepare inserts
    const inserts = trackIds.map((trackId, index) => ({
      project_id: projectId,
      track_id: trackId,
      position: startPosition + index + 1,
    }));

    // Insert in batches
    const batchSize = 50;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize);

      try {
        const { error } = await supabase
          .from('project_tracks')
          .insert(batch);

        if (error) throw error;

        success += batch.length;
      } catch (error) {
        failed += batch.length;
        logError('Failed to add batch to project', error as Error, 'bulkOperations', { batch });
      }

      onProgress?.({
        current: Math.min(i + batchSize, total),
        total,
        percentage: Math.round((Math.min(i + batchSize, total) / total) * 100),
      });
    }

    // Update project last_activity_at
    await supabase
      .from('music_projects')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', projectId);

    logInfo('Bulk add to project completed', 'bulkOperations', { success, failed });
    return { success, failed };
  } catch (error) {
    logError('Bulk add to project failed', error as Error, 'bulkOperations', { projectId });
    return { success: 0, failed: total };
  }
}

/**
 * Generate shareable link for multiple tracks
 */
export async function generateShareLink(trackIds: string[]): Promise<string> {
  logInfo('Generating share link', 'bulkOperations', { count: trackIds.length });
  
  // Encode track IDs into URL-safe string
  const encodedIds = btoa(trackIds.join(',')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/share/${encodedIds}`;
  
  return shareUrl;
}

/**
 * Decode share link to get track IDs
 */
export function decodeShareLink(encodedIds: string): string[] {
  try {
    const base64 = encodedIds.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return decoded.split(',');
  } catch (error) {
    logError('Failed to decode share link', error as Error, 'bulkOperations');
    return [];
  }
}

/**
 * Bulk export tracks to a ZIP file
 */
export async function bulkExportToZip(
  tracks: Track[],
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<{ success: number; failed: number }> {
  logInfo('Starting bulk export to ZIP', 'bulkOperations', { count: tracks.length });
  const zip = new JSZip();
  let success = 0;
  let failed = 0;
  const total = tracks.length;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    try {
      if (!track.audio_url) {
        throw new Error('Track has no audio URL');
      }

      const response = await fetch(track.audio_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }
      const audioBlob = await response.blob();

      // Sanitize filename
      const filename = `${track.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
      zip.file(filename, audioBlob);
      success++;

    } catch (error) {
      failed++;
      logError('Failed to process track for ZIP export', error as Error, 'bulkOperations', { trackId: track.id });
    } finally {
      onProgress?.({
        current: i + 1,
        total,
        percentage: Math.round(((i + 1) / total) * 100),
      });
    }
  }

  if (success > 0) {
    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `albert3_muse_synth_studio_export_${new Date().toISOString()}.zip`);
    } catch (error) {
      logError('Failed to generate or save ZIP file', error as Error, 'bulkOperations');
      // All tracks were processed but the zip failed, so we mark all as failed at this stage.
      return { success: 0, failed: total };
    }
  }

  logInfo('Bulk export to ZIP completed', 'bulkOperations', { success, failed });
  return { success, failed };
}
