/**
 * Tests for get-timestamped-lyrics Edge Function v2.2.0
 * Tests validation, normalization, and error handling
 */

import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler as getTimestampedLyricsHandler } from "../get-timestamped-lyrics/index.ts";
import {
  installFetchMock,
  mockSupabaseUser,
  VALID_JWT,
} from "./_testUtils.ts";

// Create a valid mock response that matches the new Zod schema
const createValidSunoResponse = () => ({
  alignedWords: [{
    word: "test",
    success: true,
    startS: 0,
    endS: 1,
    palign: 0.5,
  }],
  waveformData: [0.1, 0.2, 0.3],
  hootCer: 0.95,
  isStreamed: false,
});

// Create an invalid mock response (missing required fields)
const createInvalidSunoResponse = () => ({
  alignedWords: [{ word: "test" }], // Missing other fields in the word object
  // Missing waveformData, hootCer, isStreamed
});

// ====================================================================
// TEST 1: Format 1 - { code: 200, msg: "success", data: {...} }
// ====================================================================
Deno.test(
  "get-timestamped-lyrics normalizes Format 1 (code + msg + data)",
  async () => {
    mockSupabaseUser(); // Mock Supabase auth
    const sunoApiBaseUrl = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";
    const restoreFetch = installFetchMock({
      [`${sunoApiBaseUrl}/api/v1/generate/get-timestamped-lyrics`]: () =>
        new Response(
          JSON.stringify({
            code: 200,
            msg: "success",
            data: {
              alignedWords: [
                { word: "test", startS: 0, endS: 1, success: true, palign: 0.95 },
                { word: "lyrics", startS: 1, endS: 2, success: true, palign: 0.98 },
              ],
              waveformData: [0.1, 0.2, 0.3],
              hootCer: 0.85,
              isStreamed: false,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    try {
      const request = new Request(
        "http://localhost/get-timestamped-lyrics",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${VALID_JWT}`,
          },
          body: JSON.stringify({
            taskId: "test-task-id",
            audioId: "test-audio-id",
          }),
        },
      );

      const response = await getTimestampedLyricsHandler(request);

      if (response.status !== 200) {
        const errorBody = await response.text();
        console.error("Test failed:", response.status, errorBody);
      }

      assertEquals(response.status, 200);

      const payload = await response.json();

      // ✅ Should return NORMALIZED format (data only, no code/msg wrapper)
      assertObjectMatch(payload, {
        alignedWords: [
          { word: "test", startS: 0, endS: 1 },
          { word: "lyrics", startS: 1, endS: 2 },
        ],
        waveformData: [0.1, 0.2, 0.3],
        hootCer: 0.85,
      });
    } finally {
      restoreFetch();
    }
  },
);

// ====================================================================
// TEST 2: Format 2 - { success: true, data: {...} }
// ====================================================================
Deno.test(
  "get-timestamped-lyrics normalizes Format 2 (success + data)",
  async () => {
    mockSupabaseUser(); // Mock Supabase auth
    const sunoApiBaseUrl = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";
    const restoreFetch = installFetchMock({
      [`${sunoApiBaseUrl}/api/v1/generate/get-timestamped-lyrics`]: () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              alignedWords: [{ word: "normalized", startS: 0, endS: 1.5 }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    try {
      const request = new Request(
        "http://localhost/get-timestamped-lyrics",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${VALID_JWT}`,
          },
          body: JSON.stringify({
            taskId: "test-task-2",
            audioId: "test-audio-2",
          }),
        },
      );

      const response = await getTimestampedLyricsHandler(request);
      assertEquals(response.status, 200);

      const payload = await response.json();
      assertObjectMatch(payload, {
        alignedWords: [{ word: "normalized", startS: 0, endS: 1.5 }],
      });
    } finally {
      restoreFetch();
    }
  },
);

// ====================================================================
// TEST 3: Format 3 - { alignedWords: [...] } (direct)
// ====================================================================
Deno.test(
  "get-timestamped-lyrics handles Format 3 (direct data)",
  async () => {
    mockSupabaseUser(); // Mock Supabase auth
    const sunoApiBaseUrl = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";
    const restoreFetch = installFetchMock({
      [`${sunoApiBaseUrl}/api/v1/generate/get-timestamped-lyrics`]: () =>
        new Response(
          JSON.stringify({
            alignedWords: [
              { word: "direct", startS: 0, endS: 1 },
              { word: "format", startS: 1, endS: 2 },
            ],
            waveformData: [],
            hootCer: 0,
            isStreamed: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    try {
      const request = new Request(
        "http://localhost/get-timestamped-lyrics",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${VALID_JWT}`,
          },
          body: JSON.stringify({
            taskId: "test-task-3",
            audioId: "test-audio-3",
          }),
        },
      );

      const response = await getTimestampedLyricsHandler(request);
      assertEquals(response.status, 200);

      const payload = await response.json();
      assertObjectMatch(payload, {
        alignedWords: [
          { word: "direct", startS: 0, endS: 1 },
          { word: "format", startS: 1, endS: 2 },
        ],
      });
    } finally {
      restoreFetch();
    }
  },
);

// ====================================================================
// TEST 4: Error handling - Invalid response format
// ====================================================================
Deno.test(
  "get-timestamped-lyrics returns 500 for invalid Suno response",
  async () => {
    mockSupabaseUser(); // Mock Supabase auth
    const sunoApiBaseUrl = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";
    const restoreFetch = installFetchMock({
      [`${sunoApiBaseUrl}/api/v1/generate/get-timestamped-lyrics`]: () =>
        new Response(
          JSON.stringify({ unexpected: "format" }), // Invalid format
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    try {
      const request = new Request(
        "http://localhost/get-timestamped-lyrics",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${VALID_JWT}`,
          },
          body: JSON.stringify({
            taskId: "test-task-error",
            audioId: "test-audio-error",
          }),
        },
      );

      const response = await getTimestampedLyricsHandler(request);
      assertEquals(response.status, 500);

      const payload = await response.json();
      assertObjectMatch(payload, {
        error: "Invalid response format from Suno API",
      });
    } finally {
      restoreFetch();
    }
  },
);

// ====================================================================
// TEST 5: Error handling - Suno API error response
// ====================================================================
Deno.test(
  "get-timestamped-lyrics handles Suno API errors",
  async () => {
    mockSupabaseUser(); // Mock Supabase auth
    const sunoApiBaseUrl = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";
    const restoreFetch = installFetchMock({
      [`${sunoApiBaseUrl}/api/v1/generate/get-timestamped-lyrics`]: () =>
        new Response(
          JSON.stringify({ error: "Task not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        ),
    });

    try {
      const request = new Request(
        "http://localhost/get-timestamped-lyrics",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${VALID_JWT}`,
          },
          body: JSON.stringify({
            taskId: "invalid-task",
            audioId: "invalid-audio",
          }),
        },
      );

      const response = await getTimestampedLyricsHandler(request);
      assertEquals(response.status, 404);

      const payload = await response.json();
      assertObjectMatch(payload, {
        error: "Task not found",
      });
    } finally {
      restoreFetch();
    }
  },
);

// ====================================================================
// TEST 6: Validation - Missing required fields
// ====================================================================
Deno.test(
  "get-timestamped-lyrics validates request parameters",
  async () => {
    mockSupabaseUser(); // Mock Supabase auth
    const request = new Request(
      "http://localhost/get-timestamped-lyrics",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${VALID_JWT}`,
        },
        body: JSON.stringify({
          taskId: "", // Invalid: empty string
          audioId: "test-audio",
        }),
      },
    );

    const response = await getTimestampedLyricsHandler(request);
    assertEquals(response.status, 400);

    const payload = await response.json();
    assertObjectMatch(payload, {
      error: "Validation failed",
    });
  },
);
