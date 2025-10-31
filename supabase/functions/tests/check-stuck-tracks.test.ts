/**
 * Integration tests for check-stuck-tracks Edge Function
 * Tests automatic detection and recovery of stuck tracks
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { adminClient, createTestUser } from "./_testUtils.ts";

Deno.test("check-stuck-tracks: should identify tracks stuck in processing", async () => {
  const { userId } = await createTestUser();
  
  // Create a stuck track (processing for > 30 minutes)
  const { data: stuckTrack } = await adminClient
    .from('tracks')
    .insert({
      user_id: userId,
      title: 'Stuck Track',
      prompt: 'Test prompt',
      status: 'processing',
      provider: 'suno',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString() // 35 min ago
    })
    .select()
    .single();

  assertExists(stuckTrack);

  // Run the check
  const { data, error } = await adminClient.functions.invoke('check-stuck-tracks');

  assertEquals(error, null);
  assertExists(data);
  assertEquals(data.checked > 0, true);

  // Verify the track was marked as failed
  const { data: updatedTrack } = await adminClient
    .from('tracks')
    .select('status')
    .eq('id', stuckTrack.id)
    .single();

  assertEquals(updatedTrack?.status, 'failed');
});

Deno.test("check-stuck-tracks: should not affect recent processing tracks", async () => {
  const { userId } = await createTestUser();
  
  // Create a recent processing track
  const { data: recentTrack } = await adminClient
    .from('tracks')
    .insert({
      user_id: userId,
      title: 'Recent Track',
      prompt: 'Test prompt',
      status: 'processing',
      provider: 'suno',
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 min ago
    })
    .select()
    .single();

  assertExists(recentTrack);

  // Run the check
  await adminClient.functions.invoke('check-stuck-tracks');

  // Verify the track is still processing
  const { data: unchangedTrack } = await adminClient
    .from('tracks')
    .select('status')
    .eq('id', recentTrack.id)
    .single();

  assertEquals(unchangedTrack?.status, 'processing');
});

Deno.test("check-stuck-tracks: should handle different providers", async () => {
  const { userId } = await createTestUser();
  
  // Create stuck tracks for both providers
  const { data: sunoTrack } = await adminClient
    .from('tracks')
    .insert({
      user_id: userId,
      title: 'Stuck Suno',
      prompt: 'Test',
      status: 'processing',
      provider: 'suno',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  const { data: murekaTrack } = await adminClient
    .from('tracks')
    .insert({
      user_id: userId,
      title: 'Stuck Mureka',
      prompt: 'Test',
      status: 'processing',
      provider: 'mureka',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  // Run the check
  await adminClient.functions.invoke('check-stuck-tracks');

  // Both should be marked as failed
  const { data: tracks } = await adminClient
    .from('tracks')
    .select('status')
    .in('id', [sunoTrack!.id, murekaTrack!.id]);

  assertEquals(tracks?.every(t => t.status === 'failed'), true);
});
