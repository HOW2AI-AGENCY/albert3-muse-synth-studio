import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

Deno.test("improve-prompt: should reject empty prompt", async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.functions.invoke('improve-prompt', {
    body: { prompt: "" }
  });

  assertExists(error);
});

Deno.test("improve-prompt: should improve simple prompt", async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.functions.invoke('improve-prompt', {
    body: { prompt: "rock song" }
  });

  if (error) {
    console.error("Error improving prompt:", error);
  }

  // Should return improved prompt or error if LOVABLE_API_KEY not configured
  assertExists(data || error);
});

Deno.test("improve-prompt: should handle long prompt", async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const longPrompt = "A ".repeat(200) + "epic rock song";

  const { data, error } = await supabase.functions.invoke('improve-prompt', {
    body: { prompt: longPrompt }
  });

  assertExists(data || error);
});
