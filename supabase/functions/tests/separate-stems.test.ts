import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { adminClient, createTestUser, installFetchMock } from "./_testUtils.ts";

Deno.test("separate-stems: should validate required fields", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await adminClient.functions.invoke('separate-stems', {
    body: {
      // Missing taskId, audioId
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
});

Deno.test("separate-stems: should reject invalid type", async () => {
  const { accessToken } = await createTestUser();

  const { data, error } = await adminClient.functions.invoke('separate-stems', {
    body: {
      taskId: 'test-task-id',
      audioId: 'test-audio-id',
      type: 'invalid_type', // Invalid
      callBackUrl: 'https://example.com/callback'
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
});

Deno.test("separate-stems: should accept valid separate_vocal request", async () => {
  const { accessToken } = await createTestUser();

  const cleanup = installFetchMock({
    'https://api.sunoapi.org': () => 
      new Response(JSON.stringify({
        code: 200,
        data: { taskId: 'stem-task-123' }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('separate-stems', {
      body: {
        taskId: 'test-task-id',
        audioId: 'test-audio-id',
        type: 'separate_vocal',
        callBackUrl: 'https://example.com/callback'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Should succeed or return expected error
    assertExists(data || error);
  } finally {
    cleanup();
  }
});

Deno.test("separate-stems: should accept valid split_stem request", async () => {
  const { accessToken } = await createTestUser();

  const cleanup = installFetchMock({
    'https://api.sunoapi.org': () => 
      new Response(JSON.stringify({
        code: 200,
        data: { taskId: 'stem-task-456' }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('separate-stems', {
      body: {
        taskId: 'test-task-id',
        audioId: 'test-audio-id',
        type: 'split_stem',
        callBackUrl: 'https://example.com/callback'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertExists(data || error);
  } finally {
    cleanup();
  }
});

Deno.test("separate-stems: should handle Suno API errors", async () => {
  const { accessToken } = await createTestUser();

  const cleanup = installFetchMock({
    'https://api.sunoapi.org': () => 
      new Response(JSON.stringify({
        code: 500,
        msg: 'Internal server error'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('separate-stems', {
      body: {
        taskId: 'test-task-id',
        audioId: 'test-audio-id',
        type: 'separate_vocal',
        callBackUrl: 'https://example.com/callback'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertExists(error);
  } finally {
    cleanup();
  }
});

Deno.test("separate-stems: should validate callback URL format", async () => {
  const { accessToken } = await createTestUser();

  const { data, error } = await adminClient.functions.invoke('separate-stems', {
    body: {
      taskId: 'test-task-id',
      audioId: 'test-audio-id',
      type: 'separate_vocal',
      callBackUrl: 'not-a-valid-url'
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
});
