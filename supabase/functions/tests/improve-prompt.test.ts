/**
 * Integration tests for improve-prompt Edge Function
 * Tests prompt improvement using AI models
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { adminClient, createTestUser, installFetchMock } from "./_testUtils.ts";

Deno.test("improve-prompt: should validate required parameters", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await adminClient.functions.invoke('improve-prompt', {
    body: { /* missing prompt */ },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
  assertEquals(error.message.includes('prompt') || error.message.includes('required'), true);
});

Deno.test("improve-prompt: should improve basic prompt", async () => {
  const { accessToken } = await createTestUser();
  
  const cleanup = installFetchMock({
    'https://openrouter.ai': () => 
      new Response(JSON.stringify({
        choices: [{
          message: {
            content: 'Epic orchestral music with powerful drums, soaring strings, and heroic brass sections'
          }
        }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('improve-prompt', {
      body: { 
        prompt: 'epic music',
        style: 'orchestral'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertEquals(error, null);
    assertExists(data);
    assertExists(data.improvedPrompt);
    assertEquals(typeof data.improvedPrompt, 'string');
    assertEquals(data.improvedPrompt.length > 0, true);
  } finally {
    cleanup();
  }
});

Deno.test("improve-prompt: should handle AI API errors", async () => {
  const { accessToken } = await createTestUser();
  
  const cleanup = installFetchMock({
    'https://openrouter.ai': () => 
      new Response(JSON.stringify({
        error: 'Rate limit exceeded'
      }), { status: 429, headers: { 'Content-Type': 'application/json' } })
  });

  try {
    const { data, error } = await adminClient.functions.invoke('improve-prompt', {
      body: { 
        prompt: 'test music'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertExists(error);
  } finally {
    cleanup();
  }
});

Deno.test("improve-prompt: should include style in improvement", async () => {
  const { accessToken } = await createTestUser();
  
  const cleanup = installFetchMock({
    'https://openrouter.ai': (input, init) => {
      const body = JSON.parse(init?.body as string);
      const userMessage = body.messages.find((m: any) => m.role === 'user');
      
      // Verify style is included in the request
      assertEquals(userMessage.content.includes('jazz'), true);
      
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: 'Smooth jazz with saxophone, piano, and light percussion'
          }
        }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });

  try {
    const { data, error } = await adminClient.functions.invoke('improve-prompt', {
      body: { 
        prompt: 'relaxing music',
        style: 'jazz'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assertEquals(error, null);
    assertExists(data);
    assertExists(data.improvedPrompt);
  } finally {
    cleanup();
  }
});

Deno.test("improve-prompt: should validate prompt length", async () => {
  const { accessToken } = await createTestUser();
  
  const longPrompt = 'a'.repeat(2000); // Too long
  
  const { data, error } = await adminClient.functions.invoke('improve-prompt', {
    body: { 
      prompt: longPrompt
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
  assertEquals(error.message.includes('prompt') || error.message.includes('long'), true);
});

Deno.test("improve-prompt: should handle empty prompt", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await adminClient.functions.invoke('improve-prompt', {
    body: { 
      prompt: ''
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
});
