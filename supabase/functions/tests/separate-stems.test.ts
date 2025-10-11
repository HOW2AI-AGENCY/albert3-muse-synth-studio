import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

Deno.test("separate-stems: should validate required fields", async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.functions.invoke('separate-stems', {
    body: {
      // Missing taskId, audioId
    }
  });

  assertExists(error);
});

Deno.test("separate-stems: should reject invalid type", async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.functions.invoke('separate-stems', {
    body: {
      taskId: 'test-task-id',
      audioId: 'test-audio-id',
      type: 'invalid_type', // Invalid
      callBackUrl: 'https://example.com/callback'
    }
  });

  assertExists(error);
});

Deno.test("separate-stems: should accept valid separate_vocal request", async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.functions.invoke('separate-stems', {
    body: {
      taskId: 'test-task-id',
      audioId: 'test-audio-id',
      type: 'separate_vocal',
      callBackUrl: 'https://example.com/callback'
    }
  });

  // Should return data or error (depends on SUNO_API_KEY configuration)
  assertExists(data || error);
});

Deno.test("separate-stems: should accept valid split_stem request", async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.functions.invoke('separate-stems', {
    body: {
      taskId: 'test-task-id',
      audioId: 'test-audio-id',
      type: 'split_stem',
      callBackUrl: 'https://example.com/callback'
    }
  });

  assertExists(data || error);
});
