import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handler, setPollSunoCompletionOverride } from "../generate-suno/index.ts";
import type { PollSunoCompletionFn } from "../generate-suno/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
  throw new Error("Supabase test environment variables are not configured. Ensure 'supabase test' is running.");
}

// Normalise environment variables for the function runtime
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE);
Deno.env.set("SUPABASE_SERVICE_ROLE", SERVICE_ROLE);
if (!Deno.env.get("SUNO_API_KEY")) {
  Deno.env.set("SUNO_API_KEY", "test-suno-key");
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

const realFetch = globalThis.fetch;

async function clearTables() {
  await adminClient.from("track_versions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("tracks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("ai_jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("rate_limits").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
}

async function createTestUser() {
  const email = `test-${crypto.randomUUID()}@example.com`;
  const password = `Test-${crypto.randomUUID()}`;

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created?.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`);
  }

  const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({ email, password });
  if (signInError || !sessionData.session?.access_token) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  return {
    userId: created.user.id,
    accessToken: sessionData.session.access_token,
  };
}

function mockPoller(recorder: string[]): PollSunoCompletionFn {
  return async (_trackId, taskId) => {
    recorder.push(taskId);
  };
}

function installFetchMock(responders: Record<string, () => Response>) {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);
    for (const [prefix, handler] of Object.entries(responders)) {
      if (url.startsWith(prefix)) {
        return handler();
      }
    }
    return realFetch(input as Request, init);
  };
}

Deno.test({
  name: "generate-suno function scenarios",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    try {
      await clearTables();

      await t.step("creates job, track and respects idempotency", async () => {
        const pollCalls: string[] = [];
        setPollSunoCompletionOverride(mockPoller(pollCalls));
        await clearTables();
        const { userId, accessToken } = await createTestUser();

        installFetchMock({
          "https://api.sunoapi.org/api/v1/generate": () =>
            new Response(JSON.stringify({ id: "task-123" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
        });

        const body = {
          title: "Test track",
          prompt: "Make something cool",
          tags: ["synth"],
          wait_audio: false,
          idempotencyKey: crypto.randomUUID(),
        };

        const requestInit: RequestInit = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        };

        const response = await handler(new Request("http://localhost/generate-suno", requestInit));
        assertEquals(response.status, 200);
        const payload = await response.json();
        assert(payload.success);
        assertExists(payload.trackId);
        assertEquals(payload.taskId, "task-123");
        assertEquals(pollCalls, ["task-123"]);

        const { data: jobs } = await adminClient.from("ai_jobs").select("*");
        assertEquals(jobs?.length, 1);
        assertEquals(jobs?.[0].status, "processing");
        assertEquals(jobs?.[0].idempotency_key, body.idempotencyKey);

        const { data: tracks } = await adminClient.from("tracks").select("*");
        assertEquals(tracks?.length, 1);
        assertEquals(tracks?.[0].status, "processing");
        assertEquals(tracks?.[0].user_id, userId);

        const { data: rateEntries } = await adminClient
          .from("rate_limits")
          .select("*")
          .eq("user_id", userId)
          .eq("endpoint", "generate-suno");
        assertEquals(rateEntries?.length, 1);

        // Second call should reuse existing job and skip Suno API
        installFetchMock({
          "https://api.sunoapi.org/api/v1/generate": () => {
            throw new Error("Idempotent request should not trigger Suno API");
          },
        });

        const secondResponse = await handler(new Request("http://localhost/generate-suno", requestInit));
        assertEquals(secondResponse.status, 200);
        const secondPayload = await secondResponse.json();
        assertEquals(secondPayload.jobId, jobs?.[0].id);
        assertStringIncludes(secondPayload.message, "already processed");

        const { data: jobsAfter } = await adminClient.from("ai_jobs").select("*");
        assertEquals(jobsAfter?.length, 1);

        const { data: rateAfter } = await adminClient
          .from("rate_limits")
          .select("*")
          .eq("user_id", userId)
          .eq("endpoint", "generate-suno");
        assertEquals(rateAfter?.length, 2);
      });

      await t.step("resumes existing suno task without new API call", async () => {
        await clearTables();
        const { userId, accessToken } = await createTestUser();

        const { data: existingTrack } = await adminClient
          .from("tracks")
          .insert({
            user_id: userId,
            title: "Resume",
            prompt: "Resume",
            provider: "suno",
            status: "processing",
            metadata: { suno_task_id: "resume-task" },
          })
          .select()
          .single();

        assertExists(existingTrack?.id);

        const pollCalls: string[] = [];
        setPollSunoCompletionOverride(mockPoller(pollCalls));

        installFetchMock({
          "https://api.sunoapi.org/api/v1/generate": () => {
            throw new Error("Resume flow should not hit Suno API");
          },
        });

        const resumeRequest = new Request("http://localhost/generate-suno", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            trackId: existingTrack.id,
            prompt: "Resume",
            tags: ["resume"],
            wait_audio: false,
          }),
        });

        const resumeResponse = await handler(resumeRequest);
        assertEquals(resumeResponse.status, 200);
        const resumePayload = await resumeResponse.json();
        assertEquals(resumePayload.trackId, existingTrack.id);
        assertEquals(resumePayload.taskId, "resume-task");
        assertEquals(pollCalls, ["resume-task"]);

        const { data: jobs } = await adminClient.from("ai_jobs").select("*");
        assertEquals(jobs?.length, 1);
        assertEquals(jobs?.[0].status, "processing");

        const { data: tracks } = await adminClient.from("tracks").select("*");
        assertEquals(tracks?.length, 1);
        assertEquals(tracks?.[0].status, "processing");

        const { data: rateEntries } = await adminClient
          .from("rate_limits")
          .select("*")
          .eq("user_id", userId)
          .eq("endpoint", "generate-suno");
        assertEquals(rateEntries?.length, 1);
      });

      await t.step("marks job as failed when Suno API errors", async () => {
        await clearTables();
        const { userId, accessToken } = await createTestUser();
        setPollSunoCompletionOverride(() => Promise.resolve());

        installFetchMock({
          "https://api.sunoapi.org/api/v1/generate": () =>
            new Response("Internal error", { status: 500, headers: { "Content-Type": "text/plain" } }),
        });

        const request = new Request("http://localhost/generate-suno", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            prompt: "Broken",
            tags: ["fail"],
            wait_audio: false,
          }),
        });

        const response = await handler(request);
        assertEquals(response.status, 500);
        const payload = await response.json();
        assertStringIncludes(payload.error, "Suno API");
        assertEquals(payload.details?.status ?? 0, 500);

        const { data: jobs } = await adminClient.from("ai_jobs").select("*");
        assertEquals(jobs?.length, 1);
        assertEquals(jobs?.[0].status, "failed");
        assertStringIncludes(jobs?.[0].error_message ?? "", "Suno generation failed");

        const { data: tracks } = await adminClient.from("tracks").select("*");
        assertEquals(tracks?.length, 1);
        assertEquals(tracks?.[0].status, "processing");

        const { data: rateEntries } = await adminClient
          .from("rate_limits")
          .select("*")
          .eq("user_id", userId)
          .eq("endpoint", "generate-suno");
        assertEquals(rateEntries?.length, 1);
      });
    } finally {
      globalThis.fetch = realFetch;
      setPollSunoCompletionOverride();
      await clearTables();
    }
  },
});
