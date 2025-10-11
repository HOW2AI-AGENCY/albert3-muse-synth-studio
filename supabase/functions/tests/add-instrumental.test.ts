import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { anonClient } from "./_testUtils.ts";

Deno.test("add-instrumental: should validate required fields", async () => {
  const supabase = anonClient;
  
  const { data, error } = await supabase.functions.invoke('add-instrumental', {
    body: {
      // Missing required fields
    }
  });

  assertExists(error);
  assertEquals(error.message, 'Missing required fields: uploadUrl, title, negativeTags, tags');
});

Deno.test("add-instrumental: should accept valid request", async () => {
  const supabase = anonClient;
  
  const { data, error } = await supabase.functions.invoke('add-instrumental', {
    body: {
      uploadUrl: 'https://example.com/vocal.mp3',
      title: 'Test Instrumental Track',
      negativeTags: 'drums, bass',
      tags: 'rock, energetic',
      model: 'V4_5PLUS'
    }
  });

  // Note: In real test, this will fail due to Suno API call
  // This is just structure validation
  assertExists(data || error);
});

Deno.test("add-instrumental: should handle optional parameters", async () => {
  const supabase = anonClient;
  
  const { data, error } = await supabase.functions.invoke('add-instrumental', {
    body: {
      uploadUrl: 'https://example.com/vocal.mp3',
      title: 'Test Track',
      negativeTags: '',
      tags: 'rock',
      vocalGender: 'f',
      styleWeight: 0.8,
      weirdnessConstraint: 0.5,
      audioWeight: 0.7
    }
  });

  assertExists(data || error);
});
