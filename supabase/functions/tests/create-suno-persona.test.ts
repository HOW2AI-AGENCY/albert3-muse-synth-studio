/**
 * @fileoverview Unit tests for create-suno-persona edge function
 * @version 1.0.0
 * @since 2025-11-01
 */

import { adminClient, createTestUser, installFetchMock } from "./_testUtils.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";

// ============================================================================
// TEST: Validation
// ============================================================================

Deno.test("create-suno-persona: should require all mandatory fields", async () => {
  const { accessToken } = await createTestUser();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trackId: "missing-fields" }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error.includes("Missing required fields"), true);
});

Deno.test("create-suno-persona: should validate name length (min 1)", async () => {
  const { accessToken } = await createTestUser();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trackId: "test-track",
      musicIndex: 0,
      name: "",
      description: "Test description",
    }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error.includes("Name must be"), true);
});

Deno.test("create-suno-persona: should validate name length (max 100)", async () => {
  const { accessToken } = await createTestUser();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trackId: "test-track",
      musicIndex: 0,
      name: "A".repeat(101),
      description: "Test description",
    }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error.includes("Name must be"), true);
});

Deno.test("create-suno-persona: should validate description length (min 1)", async () => {
  const { accessToken } = await createTestUser();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trackId: "test-track",
      musicIndex: 0,
      name: "Test Persona",
      description: "",
    }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error.includes("Description must be"), true);
});

Deno.test("create-suno-persona: should validate description length (max 500)", async () => {
  const { accessToken } = await createTestUser();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trackId: "test-track",
      musicIndex: 0,
      name: "Test Persona",
      description: "A".repeat(501),
    }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error.includes("Description must be"), true);
});

// ============================================================================
// TEST: Track Validation
// ============================================================================

Deno.test("create-suno-persona: should reject non-existent track", async () => {
  const { userId, accessToken } = await createTestUser();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trackId: "00000000-0000-0000-0000-000000000000",
      musicIndex: 0,
      name: "Test Persona",
      description: "Test description",
    }),
  });

  assertEquals(response.status, 404);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error, "Track not found or access denied");
});

Deno.test("create-suno-persona: should reject non-Suno tracks", async () => {
  const { userId, accessToken } = await createTestUser();

  // Create a Mureka track
  const { data: track } = await adminClient.from("tracks").insert({
    user_id: userId,
    title: "Test Mureka Track",
    prompt: "Test prompt",
    provider: "mureka",
    status: "completed",
    audio_url: "https://example.com/audio.mp3",
  }).select().single();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trackId: track!.id,
      musicIndex: 0,
      name: "Test Persona",
      description: "Test description",
    }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error, "Persona can only be created from Suno AI tracks");

  // Cleanup
  await adminClient.from("tracks").delete().eq("id", track!.id);
});

Deno.test("create-suno-persona: should reject incomplete tracks", async () => {
  const { userId, accessToken } = await createTestUser();

  // Create a pending track
  const { data: track } = await adminClient.from("tracks").insert({
    user_id: userId,
    title: "Test Pending Track",
    prompt: "Test prompt",
    provider: "suno",
    status: "pending",
  }).select().single();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trackId: track!.id,
      musicIndex: 0,
      name: "Test Persona",
      description: "Test description",
    }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error, "Track must be completed before creating persona");

  // Cleanup
  await adminClient.from("tracks").delete().eq("id", track!.id);
});

Deno.test("create-suno-persona: should reject tracks without Suno task ID", async () => {
  const { userId, accessToken } = await createTestUser();

  // Create a completed track without task ID
  const { data: track } = await adminClient.from("tracks").insert({
    user_id: userId,
    title: "Test Track No Task ID",
    prompt: "Test prompt",
    provider: "suno",
    status: "completed",
    audio_url: "https://example.com/audio.mp3",
    metadata: {},
  }).select().single();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trackId: track!.id,
      musicIndex: 0,
      name: "Test Persona",
      description: "Test description",
    }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error, "Missing Suno task ID in track metadata");

  // Cleanup
  await adminClient.from("tracks").delete().eq("id", track!.id);
});

// ============================================================================
// TEST: Success Cases
// ============================================================================

Deno.test("create-suno-persona: should successfully create persona", async () => {
  const { userId, accessToken } = await createTestUser();

  // Create a valid completed Suno track
  const { data: track } = await adminClient.from("tracks").insert({
    user_id: userId,
    title: "Test Suno Track",
    prompt: "Electronic music",
    provider: "suno",
    status: "completed",
    audio_url: "https://example.com/audio.mp3",
    cover_url: "https://example.com/cover.jpg",
    style_tags: ["electronic", "upbeat"],
    metadata: {
      suno_task_id: "test-task-123",
    },
  }).select().single();

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/generate/generate-persona": () => {
      return new Response(
        JSON.stringify({
          code: 200,
          msg: "Success",
          data: {
            personaId: "suno-persona-123",
            name: "Electronic Persona",
            description: "Energetic electronic music style",
          },
        }),
        { status: 200 }
      );
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackId: track!.id,
        musicIndex: 0,
        name: "Electronic Persona",
        description: "Energetic electronic music style",
        isPublic: false,
      }),
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    assertEquals(data.success, true);
    assertExists(data.persona);
    assertEquals(data.persona.name, "Electronic Persona");
    assertEquals(data.persona.sunoPersonaId, "suno-persona-123");
    assertEquals(data.persona.sourceTrackId, track!.id);

    // Verify saved in database
    const { data: savedPersona } = await adminClient
      .from("suno_personas")
      .select("*")
      .eq("id", data.persona.id)
      .single();

    assertExists(savedPersona);
    assertEquals(savedPersona!.user_id, userId);
    assertEquals(savedPersona!.suno_persona_id, "suno-persona-123");
    assertEquals(savedPersona!.source_track_id, track!.id);

    // Cleanup
    await adminClient.from("suno_personas").delete().eq("id", data.persona.id);
  } finally {
    await adminClient.from("tracks").delete().eq("id", track!.id);
    uninstall();
  }
});

// ============================================================================
// TEST: Error Handling
// ============================================================================

Deno.test("create-suno-persona: should handle Suno API duplicate persona (409)", async () => {
  const { userId, accessToken } = await createTestUser();

  const { data: track } = await adminClient.from("tracks").insert({
    user_id: userId,
    title: "Test Track",
    prompt: "Test",
    provider: "suno",
    status: "completed",
    audio_url: "https://example.com/audio.mp3",
    metadata: { suno_task_id: "test-task-456" },
  }).select().single();

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/generate/generate-persona": () => {
      return new Response(
        JSON.stringify({
          code: 409,
          msg: "Persona already exists",
        }),
        { status: 409 }
      );
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackId: track!.id,
        musicIndex: 0,
        name: "Test",
        description: "Test",
      }),
    });

    assertEquals(response.status, 409);
    const data = await response.json();
    assertEquals(data.error, "Persona already exists for this music");
  } finally {
    await adminClient.from("tracks").delete().eq("id", track!.id);
    uninstall();
  }
});

Deno.test("create-suno-persona: should handle insufficient credits (402)", async () => {
  const { userId, accessToken } = await createTestUser();

  const { data: track } = await adminClient.from("tracks").insert({
    user_id: userId,
    title: "Test Track",
    prompt: "Test",
    provider: "suno",
    status: "completed",
    audio_url: "https://example.com/audio.mp3",
    metadata: { suno_task_id: "test-task-789" },
  }).select().single();

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/generate/generate-persona": () => {
      return new Response(
        JSON.stringify({
          code: 402,
          msg: "Insufficient credits",
        }),
        { status: 402 }
      );
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackId: track!.id,
        musicIndex: 0,
        name: "Test",
        description: "Test",
      }),
    });

    assertEquals(response.status, 402);
    const data = await response.json();
    assertEquals(data.error, "Insufficient Suno AI credits");
  } finally {
    await adminClient.from("tracks").delete().eq("id", track!.id);
    uninstall();
  }
});

// ============================================================================
// TEST: CORS
// ============================================================================

Deno.test("create-suno-persona: should handle OPTIONS preflight request", async () => {
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-suno-persona`, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
});
