import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler as getTimestampedLyricsHandler } from "../get-timestamped-lyrics/index.ts";
import { installFetchMock } from "./_testUtils.ts";

Deno.test(
  "get-timestamped-lyrics successfully proxies request and returns data",
  async () => {
    const sunoApiBaseUrl = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";
    const restoreFetch = installFetchMock({
      [`${sunoApiBaseUrl}/api/v1/generate/get-timestamped-lyrics`]: () =>
        new Response(
          JSON.stringify({
            code: 200,
            msg: "success",
            data: {
              alignedWords: [{ word: "test", startS: 0, endS: 1 }],
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
            "X-User-Id": "test-user-id",
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
        console.error(
          "Test failed with status",
          response.status,
          "and body:",
          errorBody,
        );
      }

      assertEquals(response.status, 200);

      const payload = await response.json();
      assertObjectMatch(payload, {
        code: 200,
        msg: "success",
        data: {
          alignedWords: [{ word: "test", startS: 0, endS: 1 }],
        },
      });
    } finally {
      restoreFetch();
    }
  },
);
