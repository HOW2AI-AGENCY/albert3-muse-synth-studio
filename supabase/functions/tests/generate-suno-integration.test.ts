/**
 * Integration Tests: generate-suno Edge Function
 * TEST-008: Edge Functions Integration Tests (4h)
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createTestUser, installFetchMock, adminClient } from "./_testUtils.ts";

Deno.test("generate-suno: full workflow with callback", async () => {
  const { userId, accessToken } = await createTestUser();

  // Mock Suno API responses
  const cleanupMock = installFetchMock({
    "https://api.sunoaiapi.com": async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      
      // Balance check
      if (url.includes("/api/v1/gateway/query/balance")) {
        return new Response(JSON.stringify({ data: { balance: 1000 } }), { status: 200 });
      }
      
      // Generation request
      if (url.includes("/api/v1/generate")) {
        return new Response(
          JSON.stringify({
            data: {
              task_id: "test-task-123",
              endpoint: "/api/v1/generate",
            },
          }),
          { status: 200 }
        );
      }
      
      // Status query
      if (url.includes("/api/v1/generate/record-info")) {
        return new Response(
          JSON.stringify({
            data: {
              status: "SUCCESS",
              tasks: [
                {
                  id: "audio-123",
                  audio_url: "https://cdn.suno.ai/test.mp3",
                  image_url: "https://cdn.suno.ai/cover.jpg",
                  duration: 180,
                  status: "SUCCESS",
                },
              ],
            },
          }),
          { status: 200 }
        );
      }

      return new Response("Not found", { status: 404 });
    },
  });

  try {
    // 1. Invoke generate-suno
    const { data, error } = await adminClient.functions.invoke("generate-suno", {
      body: {
        prompt: "Upbeat electronic music",
        tags: "edm, energetic",
        title: "Test Track",
        customMode: true,
        model: "V5",
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    assertExists(data);
    assertEquals(error, null);
    assertExists(data.trackId);
    assertExists(data.taskId);

    // 2. Check track was created in DB
    const { data: track, error: trackError } = await adminClient
      .from("tracks")
      .select("*")
      .eq("id", data.trackId)
      .single();

    assertEquals(trackError, null);
    assertExists(track);
    assertEquals(track.status, "processing");
    assertEquals(track.user_id, userId);

    // 3. Simulate callback from Suno
    const { error: callbackError } = await adminClient.functions.invoke("suno-callback", {
      body: {
        task_id: data.taskId,
        status: "SUCCESS",
        data: {
          tasks: [
            {
              id: "audio-123",
              audio_url: "https://cdn.suno.ai/test.mp3",
              image_url: "https://cdn.suno.ai/cover.jpg",
              duration: 180,
            },
          ],
        },
      },
    });

    assertEquals(callbackError, null);

    // 4. Verify track was updated to completed
    const { data: updatedTrack } = await adminClient
      .from("tracks")
      .select("*")
      .eq("id", data.trackId)
      .single();

    assertExists(updatedTrack);
    assertEquals(updatedTrack.status, "completed");
    assertEquals(updatedTrack.audio_url, "https://cdn.suno.ai/test.mp3");
  } finally {
    cleanupMock();
  }
});

Deno.test("generate-suno: idempotency check", async () => {
  const { userId, accessToken } = await createTestUser();

  const cleanupMock = installFetchMock({
    "https://api.sunoaiapi.com": () =>
      new Response(JSON.stringify({ data: { balance: 1000 } }), { status: 200 }),
  });

  try {
    const requestBody = {
      prompt: "Unique test track",
      tags: "test",
      title: "Idempotency Test",
      customMode: true,
      idempotencyKey: "test-key-123",
    };

    // First request
    const { data: data1 } = await adminClient.functions.invoke("generate-suno", {
      body: requestBody,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    assertExists(data1?.trackId);

    // Second request with same idempotency key
    const { data: data2 } = await adminClient.functions.invoke("generate-suno", {
      body: requestBody,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Should return same track ID
    assertEquals(data2?.trackId, data1.trackId);

    // Should only have one track in DB
    const { data: tracks } = await adminClient
      .from("tracks")
      .select("*")
      .eq("idempotency_key", "test-key-123");

    assertEquals(tracks?.length, 1);
  } finally {
    cleanupMock();
  }
});

Deno.test("generate-suno: error handling - rate limit", async () => {
  const { accessToken } = await createTestUser();

  const cleanupMock = installFetchMock({
    "https://api.sunoaiapi.com": () =>
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 }),
  });

  try {
    const { data, error } = await adminClient.functions.invoke("generate-suno", {
      body: {
        prompt: "Test",
        tags: "test",
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    assertExists(error);
    assertEquals(error.message.includes("429") || error.message.includes("rate"), true);
  } finally {
    cleanupMock();
  }
});

Deno.test("generate-suno: error handling - timeout", async () => {
  const { userId, accessToken } = await createTestUser();

  const cleanupMock = installFetchMock({
    "https://api.sunoaiapi.com": async () => {
      // Simulate timeout
      await new Promise((resolve) => setTimeout(resolve, 35000));
      return new Response("Timeout", { status: 408 });
    },
  });

  try {
    const { data, error } = await adminClient.functions.invoke("generate-suno", {
      body: {
        prompt: "Test timeout",
        tags: "test",
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Should fail gracefully
    assertExists(error);
  } finally {
    cleanupMock();
  }
});
