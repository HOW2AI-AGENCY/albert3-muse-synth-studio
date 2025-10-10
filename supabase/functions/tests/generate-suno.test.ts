import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, setPollSunoCompletionOverride } from "../generate-suno/index.ts";
import type { PollSunoCompletionFn } from "../generate-suno/index.ts";
import { adminClient, createTestUser, installFetchMock } from "./_testUtils.ts";

async function clearTables() {
  await adminClient.from("track_versions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("tracks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("ai_jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("rate_limits").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
}

function mockPoller(recorder: string[]): PollSunoCompletionFn {
  return async (_trackId, taskId) => {
    recorder.push(taskId);
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

        const body = {
          title: "Test track",
          prompt: "Make something cool",
          tags: ["synth"],
          wait_audio: false,
          lyrics: "Custom lyrics",
          hasVocals: true,
          customMode: true,
          idempotencyKey: crypto.randomUUID(),
        };

        const observedSunoRequests: unknown[] = [];
        const restorePrimaryFetch = installFetchMock({
          "https://api.sunoapi.org/api/v1/generate/credit": () =>
            new Response(
              JSON.stringify({ code: 200, msg: "ok", data: 25 }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          "https://api.sunoapi.org/api/v1/generate": (_input, init) => {
            if (init?.body) {
              if (typeof init.body === "string") {
                observedSunoRequests.push(JSON.parse(init.body));
              } else if (init.body instanceof Uint8Array) {
                observedSunoRequests.push(JSON.parse(new TextDecoder().decode(init.body)));
              }
            }
            return new Response(JSON.stringify({ id: "task-123" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          },
        });

        const requestInit: RequestInit = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        };

        let createdJobId: string | null = null;

        try {
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
          createdJobId = jobs?.[0]?.id ?? null;

          const { data: tracks } = await adminClient.from("tracks").select("*");
          assertEquals(tracks?.length, 1);
          assertEquals(tracks?.[0].status, "processing");
          assertEquals(tracks?.[0].user_id, userId);
          assertEquals(tracks?.[0].lyrics, body.lyrics);
          assertEquals(tracks?.[0].has_vocals, body.hasVocals);
          assertEquals(tracks?.[0].style_tags, body.tags);

          assertEquals(observedSunoRequests.length, 1);
          const sunoRequestPayload = observedSunoRequests[0] as Record<string, unknown>;
          assertEquals(sunoRequestPayload.lyrics, body.lyrics);
          assertEquals(sunoRequestPayload.has_vocals, body.hasVocals);
          assertEquals(sunoRequestPayload.custom_mode, body.customMode);

          const trackMetadata = tracks?.[0].metadata as Record<string, unknown> | null;
          assert(trackMetadata);
          assertEquals(trackMetadata?.lyrics, body.lyrics);
          assertEquals(trackMetadata?.has_vocals, body.hasVocals);
          assertEquals(trackMetadata?.custom_mode, body.customMode);

          const { data: rateEntries } = await adminClient
            .from("rate_limits")
            .select("*")
            .eq("user_id", userId)
            .eq("endpoint", "generate-suno");
          assertEquals(rateEntries?.length, 1);
        } finally {
          restorePrimaryFetch();
        }

        const restoreIdempotentFetch = installFetchMock({
          "https://api.sunoapi.org/api/v1/generate/credit": () =>
            new Response(
              JSON.stringify({ code: 200, msg: "ok", data: 20 }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          "https://api.sunoapi.org/api/v1/generate": () => {
            throw new Error("Idempotent request should not trigger Suno API");
          },
        });

        try {
          const secondResponse = await handler(new Request("http://localhost/generate-suno", requestInit));
          assertEquals(secondResponse.status, 200);
          const secondPayload = await secondResponse.json();
          assertEquals(secondPayload.jobId, createdJobId);
          assertStringIncludes(secondPayload.message, "already processed");
        } finally {
          restoreIdempotentFetch();
        }

        const { data: jobsAfter } = await adminClient.from("ai_jobs").select("*");
        assertEquals(jobsAfter?.length, 1);

        const { data: rateAfter } = await adminClient
          .from("rate_limits")
          .select("*")
          .eq("user_id", userId)
          .eq("endpoint", "generate-suno");
        assertEquals(rateAfter?.length, 2);
      });

      await t.step("returns 402 when suno balance is depleted", async () => {
        await clearTables();
        const { accessToken } = await createTestUser();

        const requestInit: RequestInit = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: "Insufficient balance",
            prompt: "Generate something",
            tags: ["test"],
            wait_audio: false,
          }),
        };

        const restoreBalanceFetch = installFetchMock({
          "https://api.sunoapi.org/api/v1/generate/credit": () =>
            new Response(
              JSON.stringify({ code: 200, msg: "ok", data: 0 }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          "https://api.sunoapi.org/api/v1/generate": () => {
            throw new Error("Generation should not start when balance is empty");
          },
        });

        try {
          const response = await handler(new Request("http://localhost/generate-suno", requestInit));
          assertEquals(response.status, 402);
          const payload = await response.json();
          assertStringIncludes(payload.error, "Недостаточно кредитов Suno");
          assertEquals(payload.details?.provider, "suno");
        } finally {
          restoreBalanceFetch();
        }

        const { data: jobs } = await adminClient.from("ai_jobs").select("*");
        assertEquals(jobs?.length, 1);
        assertEquals(jobs?.[0].status, "failed");
        assertStringIncludes(jobs?.[0].error_message ?? "", "Недостаточно кредитов");

        const { data: tracks } = await adminClient.from("tracks").select("*");
        assertEquals(tracks?.length, 0);
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

        const restoreResumeFetch = installFetchMock({
          "https://api.sunoapi.org/api/v1/generate/credit": () =>
            new Response(
              JSON.stringify({ code: 200, msg: "ok", data: 18 }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          "https://api.sunoapi.org/api/v1/generate": (_input, _init) => {
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

        try {
          const resumeResponse = await handler(resumeRequest);
          assertEquals(resumeResponse.status, 200);
          const resumePayload = await resumeResponse.json();
          assertEquals(resumePayload.trackId, existingTrack.id);
          assertEquals(resumePayload.taskId, "resume-task");
          assertEquals(pollCalls, ["resume-task"]);
        } finally {
          restoreResumeFetch();
        }

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

        const restoreErrorFetch = installFetchMock({
          "https://api.sunoapi.org/api/v1/generate": (_input, _init) =>
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

        try {
          const response = await handler(request);
          assertEquals(response.status, 500);
          const payload = await response.json();
          assertStringIncludes(payload.error, "Suno API");
          assertEquals(payload.details?.status ?? 0, 500);
        } finally {
          restoreErrorFetch();
        }

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
      setPollSunoCompletionOverride();
      await clearTables();
    }
  },
});
