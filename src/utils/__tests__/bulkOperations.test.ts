
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bulkExportToZip } from '../bulkOperations';
import * as fileSaver from 'file-saver';
import JSZip from 'jszip';

// Mock the file-saver library
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn();

describe('bulkExportToZip', () => {
  let fileSpy: vi.SpyInstance;
  let generateAsyncSpy: vi.SpyInstance;

  beforeEach(() => {
    // Spy on the prototype methods of JSZip
    fileSpy = vi.spyOn(JSZip.prototype, 'file').mockReturnThis();
    generateAsyncSpy = vi.spyOn(JSZip.prototype, 'generateAsync').mockResolvedValue(new Blob(['zip content']));

    // Reset fetch mock
    (global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio content'])),
    });
  });

  afterEach(() => {
    // Restore original methods
    vi.restoreAllMocks();
  });

  const mockTracks = [
    { id: '1', title: 'Track One', audio_url: 'http://example.com/track1.mp3' },
    { id: '2', title: 'Track Two', audio_url: 'http://example.com/track2.mp3' },
  ];

  it('should create a zip file with the correct tracks', async () => {
    const { saveAs } = await import('file-saver');
    await bulkExportToZip(mockTracks, vi.fn());

    expect(fileSpy).toHaveBeenCalledTimes(2);
    expect(fileSpy).toHaveBeenCalledWith('track_one.mp3', expect.any(Blob));
    expect(fileSpy).toHaveBeenCalledWith('track_two.mp3', expect.any(Blob));
    expect(generateAsyncSpy).toHaveBeenCalledWith({ type: 'blob' });
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining('albert3_muse_synth_studio_export_'));
  });

  it('should call onProgress for each track', async () => {
    const onProgress = vi.fn();
    await bulkExportToZip(mockTracks, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith({ current: 1, total: 2, percentage: 50 });
    expect(onProgress).toHaveBeenCalledWith({ current: 2, total: 2, percentage: 100 });
  });

  it('should handle tracks with no audio_url', async () => {
    const tracksWithMissingUrl = [...mockTracks, { id: '3', title: 'No URL', audio_url: null }];
    const { success, failed } = await bulkExportToZip(tracksWithMissingUrl, vi.fn());

    expect(success).toBe(2);
    expect(failed).toBe(1);
    expect(fileSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle fetch errors', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({ ok: false, statusText: 'Not Found' });
    const { success, failed } = await bulkExportToZip(mockTracks, vi.fn());

    expect(success).toBe(1);
    expect(failed).toBe(1);
    expect(fileSpy).toHaveBeenCalledTimes(1);
  });
});
