import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createTestUser, installFetchMock, adminClient } from "./_testUtils.ts";

Deno.test({
  name: "create-cover validates required fields",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { accessToken } = await createTestUser();

    const { data, error } = await adminClient.functions.invoke('create-cover', {
      body: {}, // Missing required fields
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    assertExists(error);
  },
});

Deno.test({
  name: "create-cover handles instrumental flag correctly",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { accessToken } = await createTestUser();

    let capturedPayload: any;

    const restoreFetch = installFetchMock({
      "https://api.sunoapi.org/api/v1/generate/credit": () =>
        new Response(JSON.stringify({ code: 200, msg: "success", data: 100 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      "https://api.sunoapi.org/api/v1/generate": (_, init) => {
        capturedPayload = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({ code: 200, msg: "success", data: { taskId: "test-task-123" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
    });

    try {
      const { data } = await adminClient.functions.invoke('create-cover', {
        body: {
          prompt: "Rock cover",
          make_instrumental: true,
          referenceAudioUrl: "https://example.com/audio.mp3",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      assertExists(capturedPayload);
      assertEquals(capturedPayload.instrumental, true);
      assertEquals(capturedPayload.audioUrl, "https://example.com/audio.mp3");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "create-cover passes reference audio URL",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { accessToken } = await createTestUser();

    let capturedPayload: any;

    const restoreFetch = installFetchMock({
      "https://api.sunoapi.org/api/v1/generate/credit": () =>
        new Response(JSON.stringify({ code: 200, msg: "success", data: 100 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      "https://api.sunoapi.org/api/v1/generate": (_, init) => {
        capturedPayload = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({ code: 200, msg: "success", data: { taskId: "test-task-456" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
    });

    try {
      const { data } = await adminClient.functions.invoke('create-cover', {
        body: {
          prompt: "Jazz cover",
          referenceAudioUrl: "https://storage.example.com/reference.mp3",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      assertExists(capturedPayload);
      assertEquals(capturedPayload.audioUrl, "https://storage.example.com/reference.mp3");
    } finally {
      restoreFetch();
    }
  },
});
