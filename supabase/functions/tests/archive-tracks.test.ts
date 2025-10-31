/**
 * Integration tests for archive-tracks Edge Function
 * Tests automatic archiving workflow
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { adminClient, createTestUser } from "./_testUtils.ts";

Deno.test("archive-tracks: should identify tracks needing archiving", async () => {
  const { userId } = await createTestUser();
  
  // Create a track that's 14 days old (needs archiving)
  const { data: oldTrack } = await adminClient
    .from('tracks')
    .insert({
      user_id: userId,
      title: 'Old Track Needing Archive',
      prompt: 'Test prompt',
      status: 'completed',
      provider: 'suno',
      audio_url: 'https://cdn.suno.ai/test-audio.mp3',
      archived_to_storage: false,
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  assertExists(oldTrack);

  // Query tracks needing archiving
  const { data: tracksToArchive, error } = await adminClient.rpc(
    'get_tracks_needing_archiving',
    { _limit: 10 }
  );

  assertEquals(error, null);
  assertExists(tracksToArchive);
  
  // Should include our old track
  const foundTrack = tracksToArchive.find((t: any) => t.track_id === oldTrack.id);
  assertExists(foundTrack);
  assertEquals(foundTrack.days_until_expiry <= 1, true);
});

Deno.test("archive-tracks: should not archive recent tracks", async () => {
  const { userId } = await createTestUser();
  
  // Create a recent track (3 days old)
  const { data: recentTrack } = await adminClient
    .from('tracks')
    .insert({
      user_id: userId,
      title: 'Recent Track',
      prompt: 'Test prompt',
      status: 'completed',
      provider: 'suno',
      audio_url: 'https://cdn.suno.ai/recent-audio.mp3',
      archived_to_storage: false,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  assertExists(recentTrack);

  // Query tracks needing archiving
  const { data: tracksToArchive } = await adminClient.rpc(
    'get_tracks_needing_archiving',
    { _limit: 100 }
  );

  // Should NOT include recent track
  const foundTrack = tracksToArchive?.find((t: any) => t.track_id === recentTrack.id);
  assertEquals(foundTrack, undefined);
});

Deno.test("archive-tracks: should mark track as archived", async () => {
  const { userId } = await createTestUser();
  
  const { data: track } = await adminClient
    .from('tracks')
    .insert({
      user_id: userId,
      title: 'Track to Archive',
      prompt: 'Test',
      status: 'completed',
      provider: 'suno',
      audio_url: 'https://cdn.suno.ai/test.mp3',
      archived_to_storage: false
    })
    .select()
    .single();

  assertExists(track);

  // Mark as archived
  const { error } = await adminClient.rpc('mark_track_archived', {
    _track_id: track.id,
    _storage_audio_url: 'https://storage.supabase.co/tracks-audio/test.mp3',
    _storage_cover_url: 'https://storage.supabase.co/tracks-covers/test.jpg'
  });

  assertEquals(error, null);

  // Verify it's marked as archived
  const { data: archivedTrack } = await adminClient
    .from('tracks')
    .select('archived_to_storage, storage_audio_url, archived_at')
    .eq('id', track.id)
    .single();

  assertExists(archivedTrack);
  assertEquals(archivedTrack.archived_to_storage, true);
  assertEquals(archivedTrack.storage_audio_url, 'https://storage.supabase.co/tracks-audio/test.mp3');
  assertExists(archivedTrack.archived_at);
});

Deno.test("archive-tracks: should handle tracks with all media types", async () => {
  const { userId } = await createTestUser();
  
  const { data: track } = await adminClient
    .from('tracks')
    .insert({
      user_id: userId,
      title: 'Full Media Track',
      prompt: 'Test',
      status: 'completed',
      provider: 'suno',
      audio_url: 'https://cdn.suno.ai/audio.mp3',
      cover_url: 'https://cdn.suno.ai/cover.jpg',
      video_url: 'https://cdn.suno.ai/video.mp4',
      archived_to_storage: false
    })
    .select()
    .single();

  assertExists(track);

  // Archive all media
  const { error } = await adminClient.rpc('mark_track_archived', {
    _track_id: track.id,
    _storage_audio_url: 'https://storage.supabase.co/tracks-audio/audio.mp3',
    _storage_cover_url: 'https://storage.supabase.co/tracks-covers/cover.jpg',
    _storage_video_url: 'https://storage.supabase.co/tracks-videos/video.mp4'
  });

  assertEquals(error, null);

  // Verify all URLs updated
  const { data: archivedTrack } = await adminClient
    .from('tracks')
    .select('storage_audio_url, storage_cover_url, storage_video_url')
    .eq('id', track.id)
    .single();

  assertExists(archivedTrack);
  assertExists(archivedTrack.storage_audio_url);
  assertExists(archivedTrack.storage_cover_url);
  assertExists(archivedTrack.storage_video_url);
});
