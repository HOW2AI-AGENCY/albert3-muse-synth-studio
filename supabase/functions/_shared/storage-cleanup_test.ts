import { parseStoragePath, decideCleanup, type TrackStatusInfo } from './storage-cleanup.ts';

Deno.test('parseStoragePath parses userId/trackId/file correctly', () => {
  const parsed = parseStoragePath('user-123/track-456/audio.mp3');
  if (!parsed) throw new Error('parsed is null');
  if (parsed.userId !== 'user-123') throw new Error('userId mismatch');
  if (parsed.trackId !== 'track-456') throw new Error('trackId mismatch');
  if (parsed.fileName !== 'audio.mp3') throw new Error('fileName mismatch');
});

Deno.test('decideCleanup returns orphan_track for non-existing track', () => {
  const now = new Date('2025-11-08T00:00:00Z');
  const updatedAt = new Date('2025-08-01T00:00:00Z');
  const track: TrackStatusInfo = { exists: false };
  const decision = decideCleanup(updatedAt, now, 90, track);
  if (!decision.delete || decision.reason !== 'orphan_track') {
    throw new Error('Expected orphan_track deletion');
  }
});

Deno.test('decideCleanup for failed track respects failedRetentionDays', () => {
  const now = new Date('2025-11-08T00:00:00Z');
  const updatedAt = new Date('2025-11-01T00:00:00Z'); // 7 дней назад
  const track: TrackStatusInfo = { exists: true, status: 'failed' };
  const decision = decideCleanup(updatedAt, now, 90, track, 7);
  if (!decision.delete || decision.reason !== 'failed_old') {
    throw new Error('Expected failed_old deletion');
  }
});

Deno.test('decideCleanup respects retentionDays for completed track', () => {
  const now = new Date('2025-11-08T00:00:00Z');
  const updatedAt = new Date('2025-07-01T00:00:00Z'); // > 90 дней
  const track: TrackStatusInfo = { exists: true, status: 'completed' };
  const decision = decideCleanup(updatedAt, now, 90, track);
  if (!decision.delete || decision.reason !== 'retention_expired') {
    throw new Error('Expected retention_expired deletion');
  }
});