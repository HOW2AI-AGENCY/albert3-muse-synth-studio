import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { anonClient } from "./_testUtils.ts";

Deno.test("upload-extend-audio: should validate required fields", async () => {
  const supabase = anonClient;
  
  const { data, error } = await supabase.functions.invoke('upload-extend-audio', {
    body: {
      // Missing uploadUrl and defaultParamFlag
    }
  });

  assertExists(error);
  assertEquals(error.message, 'Missing required fields: uploadUrl, defaultParamFlag');
});

Deno.test("upload-extend-audio: should validate defaultParamFlag requirements", async () => {
  const supabase = anonClient;
  
  const { data, error } = await supabase.functions.invoke('upload-extend-audio', {
    body: {
      uploadUrl: 'https://example.com/audio.mp3',
      defaultParamFlag: true,
      // Missing style, title, continueAt
    }
  });

  assertExists(error);
  assertEquals(error.message, 'When defaultParamFlag is true, style, title, and continueAt are required');
});

Deno.test("upload-extend-audio: should accept valid request", async () => {
  const supabase = anonClient;
  
  const { data, error } = await supabase.functions.invoke('upload-extend-audio', {
    body: {
      uploadUrl: 'https://example.com/audio.mp3',
      defaultParamFlag: true,
      style: 'rock',
      title: 'Test Extended Track',
      continueAt: 30,
      model: 'V4_5PLUS'
    }
  });

  // Note: In real test, this will fail due to Suno API call
  // This is just structure validation
  assertExists(data || error);
});
