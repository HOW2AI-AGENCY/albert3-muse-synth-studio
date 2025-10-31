/**
 * Integration tests for generate-mureka Edge Function
 * Tests Mureka AI music generation with mocked API
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { adminClient, createTestUser, installFetchMock } from "./_testUtils.ts";

Deno.test("generate-mureka: should validate required parameters", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await adminClient.functions.invoke('generate-mureka', {
    body: { /* missing prompt */ },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
  assertEquals(error.message.includes('prompt') || error.message.includes('required'), true);
});

Deno.test("generate-mureka: should create track and call Mureka API", async () => {
  const { accessToken, userId } = await createTestUser();
  
  // Mock Mureka API response
  const cleanup = installFetchMock({
    'https://api.mureka.ai': () => 
      new Response(JSON.stringify({
        success: true,
        data: {
          taskId: 'mureka-task-456',
          status: 'pending'
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('generate-mureka', {
      body: { 
        prompt: 'Electronic dance music with heavy bass',
        style: 'edm',
        duration: 120,
        model: 'mureka-v2'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertEquals(error, null);
    assertExists(data);
    assertExists(data.trackId);

    // Verify track was created in database
    const { data: track } = await adminClient
      .from('tracks')
      .select('*')
      .eq('id', data.trackId)
      .single();

    assertExists(track);
    assertEquals(track.user_id, userId);
    assertEquals(track.status, 'processing');
    assertEquals(track.provider, 'mureka');
  } finally {
    cleanup();
  }
});

Deno.test("generate-mureka: should handle API errors", async () => {
  const { accessToken } = await createTestUser();
  
  // Mock Mureka API error
  const cleanup = installFetchMock({
    'https://api.mureka.ai': () => 
      new Response(JSON.stringify({
        success: false,
        error: 'Invalid API key'
      }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('generate-mureka', {
      body: { 
        prompt: 'Test track',
        style: 'pop'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertExists(error);
  } finally {
    cleanup();
  }
});

Deno.test("generate-mureka: should support custom styles", async () => {
  const { accessToken } = await createTestUser();
  
  const cleanup = installFetchMock({
    'https://api.mureka.ai': (input, init) => {
      const body = JSON.parse(init?.body as string);
      assertEquals(body.style, 'ambient');
      
      return new Response(JSON.stringify({
        success: true,
        data: { taskId: 'test-task' }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });

  try {
    const { data, error } = await adminClient.functions.invoke('generate-mureka', {
      body: { 
        prompt: 'Calm ambient soundscape',
        style: 'ambient',
        tempo: 80
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertEquals(error, null);
    assertExists(data);
  } finally {
    cleanup();
  }
});

Deno.test("generate-mureka: should validate duration limits", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await adminClient.functions.invoke('generate-mureka', {
    body: { 
      prompt: 'Test track',
      duration: 600 // Too long (max 300s)
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
  assertEquals(error.message.includes('duration'), true);
});
