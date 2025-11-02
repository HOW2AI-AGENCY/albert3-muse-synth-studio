import { supabase } from '@/integrations/supabase/client';
import { StudioTrack } from '@/hooks/studio/useStudioSession';

export interface StudioProject {
  id?: string;
  name: string;
  bpm: number;
  time_signature: string;
  snap_enabled: boolean;
  snap_to: 'bar' | 'beat' | 'second' | 'millisecond';
  tracks: StudioTrack[];
}

export class ProjectSerializer {
  async saveProject(project: StudioProject, userId: string): Promise<string> {
    const { data: projectData, error: projectError } = await supabase
      .from('studio_projects')
      .upsert({
        id: project.id,
        user_id: userId,
        name: project.name,
        bpm: project.bpm,
        time_signature: project.time_signature,
        snap_enabled: project.snap_enabled,
        snap_to: project.snap_to,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (projectError) throw projectError;

    const projectId = projectData.id;

    // Delete existing tracks for this project
    await supabase
      .from('studio_project_tracks')
      .delete()
      .eq('project_id', projectId);

    // Insert new tracks
    const tracksToInsert = project.tracks.map((track, index) => ({
      project_id: projectId,
      track_id: track.trackId || null,
      name: track.name,
      audio_url: track.audioUrl,
      start_time: track.startTime || 0,
      trim_start: track.trimStart || 0,
      trim_end: track.trimEnd || 0,
      volume: track.volume,
      pan: track.pan,
      color: track.color,
      muted: track.muted,
      solo: track.solo,
      effects: track.effects || [],
      automation: track.automation || {},
      order_index: index,
    }));

    if (tracksToInsert.length > 0) {
      const { error: tracksError } = await supabase
        .from('studio_project_tracks')
        .insert(tracksToInsert);

      if (tracksError) throw tracksError;
    }

    return projectId;
  }

  async loadProject(projectId: string): Promise<StudioProject | null> {
    const { data: project, error: projectError } = await supabase
      .from('studio_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Failed to load project:', projectError);
      return null;
    }

    const { data: tracks, error: tracksError } = await supabase
      .from('studio_project_tracks')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index');

    if (tracksError) {
      console.error('Failed to load tracks:', tracksError);
      return null;
    }

    const studioTracks: StudioTrack[] = (tracks || []).map(t => ({
      id: t.id,
      trackId: t.track_id,
      name: t.name,
      audioUrl: t.audio_url || '',
      startTime: Number(t.start_time),
      trimStart: Number(t.trim_start),
      trimEnd: Number(t.trim_end),
      volume: Number(t.volume),
      pan: Number(t.pan),
      color: t.color || '#3b82f6',
      duration: 0, // Will be loaded from audio
      muted: t.muted,
      solo: t.solo,
      isStem: false,
      stemType: null,
      effects: t.effects as any[] || [],
      automation: t.automation || {},
      audioElement: null,
    }));

    return {
      id: project.id,
      name: project.name,
      bpm: project.bpm,
      time_signature: project.time_signature,
      snap_enabled: project.snap_enabled,
      snap_to: project.snap_to as any,
      tracks: studioTracks,
    };
  }

  async listProjects(userId: string): Promise<Array<{ id: string; name: string; updated_at: string; track_count: number }>> {
    const { data, error } = await supabase
      .from('studio_projects')
      .select(`
        id,
        name,
        updated_at,
        studio_project_tracks (count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      updated_at: p.updated_at,
      track_count: (p.studio_project_tracks as any[])[0]?.count || 0,
    }));
  }

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('studio_projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  }
}

export const projectSerializer = new ProjectSerializer();
