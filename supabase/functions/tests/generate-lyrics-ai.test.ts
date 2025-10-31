/**
 * Integration tests for generate-lyrics-ai Edge Function
 * Tests AI lyrics generation with Lovable AI models
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { adminClient, createTestUser, installFetchMock } from "./_testUtils.ts";

Deno.test("generate-lyrics-ai: should validate required parameters", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await adminClient.functions.invoke('generate-lyrics-ai', {
    body: { /* missing prompt */ },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
});

Deno.test("generate-lyrics-ai: should generate lyrics with default model", async () => {
  const { accessToken } = await createTestUser();
  
  // Mock Lovable AI response
  const cleanup = installFetchMock({
    'https://api.lovable.app': () => 
      new Response(JSON.stringify({
        choices: [{
          message: {
            content: '[Verse]\nGenerated lyrics here\n[Chorus]\nAmazing chorus'
          }
        }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('generate-lyrics-ai', {
      body: { 
        prompt: 'Write lyrics about love and hope',
        genre: 'pop',
        mood: 'uplifting'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertEquals(error, null);
    assertExists(data);
    assertExists(data.lyrics);
    assertEquals(data.lyrics.includes('[Verse]'), true);
    assertEquals(data.lyrics.includes('[Chorus]'), true);
  } finally {
    cleanup();
  }
});

Deno.test("generate-lyrics-ai: should support custom model selection", async () => {
  const { accessToken } = await createTestUser();
  
  const cleanup = installFetchMock({
    'https://api.lovable.app': (input, init) => {
      const body = JSON.parse(init?.body as string);
      assertEquals(body.model, 'openai/gpt-5-mini');
      
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: '[Verse]\nCustom model lyrics'
          }
        }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });

  try {
    const { data, error } = await adminClient.functions.invoke('generate-lyrics-ai', {
      body: { 
        prompt: 'Write rock lyrics',
        model: 'openai/gpt-5-mini'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertEquals(error, null);
    assertExists(data?.lyrics);
  } finally {
    cleanup();
  }
});

Deno.test("generate-lyrics-ai: should handle API errors gracefully", async () => {
  const { accessToken } = await createTestUser();
  
  const cleanup = installFetchMock({
    'https://api.lovable.app': () => 
      new Response(JSON.stringify({
        error: { message: 'Rate limit exceeded' }
      }), { status: 429, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('generate-lyrics-ai', {
      body: { 
        prompt: 'Test lyrics'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertExists(error);
  } finally {
    cleanup();
  }
});

Deno.test("generate-lyrics-ai: should validate prompt length limits", async () => {
  const { accessToken } = await createTestUser();
  
  const longPrompt = 'A'.repeat(1500); // Too long
  
  const { data, error } = await adminClient.functions.invoke('generate-lyrics-ai', {
    body: { 
      prompt: longPrompt
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
  assertEquals(error.message.includes('prompt'), true);
});
