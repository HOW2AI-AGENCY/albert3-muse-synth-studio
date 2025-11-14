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

Deno.test(
  "get-timestamped-lyrics (Happy Path): Success with valid upstream response",
  async () => {
    mockSupabaseUser(); // Mock Supabase auth
    const sunoApiBaseUrl = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";
    const restoreFetch = installFetchMock({
      [`${sunoApiBaseUrl}/api/v1/generate/get-timestamped-lyrics`]: () =>
        new Response(
          JSON.stringify(createValidSunoResponse()),
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
      assertEquals(response.status, 200);

      const payload = await response.json();
      assertObjectMatch(payload, createValidSunoResponse());
    } finally {
      restoreFetch();
    }
  },
);

Deno.test(
  "get-timestamped-lyrics (Failure Path): Returns 502 on invalid upstream response",
  async () => {
    mockSupabaseUser(); // Mock Supabase auth
    const sunoApiBaseUrl = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";
    const restoreFetch = installFetchMock({
      [`${sunoApiBaseUrl}/api/v1/generate/get-timestamped-lyrics`]: () =>
        new Response(
          JSON.stringify(createInvalidSunoResponse()),
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
      assertEquals(response.status, 502);

      const payload = await response.json();
      assertEquals(payload.error, "Invalid response from upstream service");
    } finally {
      restoreFetch();
    }
  },
);
