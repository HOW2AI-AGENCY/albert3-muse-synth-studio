/**
 * Integration tests for generate-suno Edge Function
 * Tests music generation flow with mocked Suno API
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { adminClient, createTestUser, installFetchMock } from "./_testUtils.ts";

Deno.test("generate-suno: should validate required parameters", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await adminClient.functions.invoke('generate-suno', {
    body: { /* missing prompt */ },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
  assertEquals(error.message.includes('prompt'), true);
});

Deno.test("generate-suno: should validate prompt length", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await adminClient.functions.invoke('generate-suno', {
    body: { 
      prompt: 'a', // Too short
      tags: 'rock'
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
});

Deno.test("generate-suno: should validate tags", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await adminClient.functions.invoke('generate-suno', {
    body: { 
      prompt: 'A calm piano melody',
      tags: 'rock,jazz,blues,metal,electronic,ambient,classical,country' // Too many tags
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
});

Deno.test("generate-suno: should create track and call Suno API", async () => {
  const { accessToken, userId } = await createTestUser();
  
  // Mock Suno API response
  const cleanup = installFetchMock({
    'https://api.sunoapi.org/api/v1/gateway/generate/music': () => 
      new Response(JSON.stringify({
        code: 200,
        data: {
          taskId: 'test-task-123'
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('generate-suno', {
      body: { 
        prompt: 'Epic orchestral battle music',
        tags: 'orchestral, epic',
        make_instrumental: false,
        model: 'chirp-v3-5'
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
    assertEquals(track.provider, 'suno');
  } finally {
    cleanup();
  }
});

Deno.test("generate-suno: should handle Suno API errors", async () => {
  const { accessToken } = await createTestUser();
  
  // Mock Suno API error response
  const cleanup = installFetchMock({
    'https://api.sunoapi.org/api/v1/gateway/generate/music': () => 
      new Response(JSON.stringify({
        code: 429,
        msg: 'Insufficient credits'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('generate-suno', {
      body: { 
        prompt: 'Test track',
        tags: 'rock'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertExists(error);
    assertEquals(error.message.includes('credits'), true);
  } finally {
    cleanup();
  }
});

Deno.test("generate-suno: should enforce rate limits", async () => {
  const { accessToken, userId } = await createTestUser();
  
  // Mock Suno API to always succeed
  const cleanup = installFetchMock({
    'https://api.sunoapi.org/api/v1/gateway/generate/music': () => 
      new Response(JSON.stringify({
        code: 200,
        data: { taskId: 'test-task' }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    // Make multiple rapid requests
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(
        adminClient.functions.invoke('generate-suno', {
          body: { 
            prompt: `Test track ${i}`,
            tags: 'rock'
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      );
    }

    const results = await Promise.all(promises);
    
    // At least one should be rate limited
    const rateLimited = results.some(r => r.error?.message.includes('rate limit'));
    assertEquals(rateLimited, true);
  } finally {
    cleanup();
  }
});

Deno.test("generate-suno: should store suno_task_id for polling", async () => {
  const { accessToken } = await createTestUser();
  
  const mockTaskId = 'suno-task-xyz789';
  const cleanup = installFetchMock({
    'https://api.sunoapi.org/api/v1/gateway/generate/music': () => 
      new Response(JSON.stringify({
        code: 200,
        data: { taskId: mockTaskId }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data } = await adminClient.functions.invoke('generate-suno', {
      body: { 
        prompt: 'Test track with task ID',
        tags: 'ambient'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const { data: track } = await adminClient
      .from('tracks')
      .select('suno_id')
      .eq('id', data.trackId)
      .single();

    assertExists(track);
    assertEquals(track!.suno_id, mockTaskId);
  } finally {
    cleanup();
  }
});
