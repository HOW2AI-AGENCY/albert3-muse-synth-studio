/**
 * Integration Tests: generate-mureka Edge Function
 * TEST-008: Mureka-specific flow (lyrics generation + music)
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createTestUser, installFetchMock, adminClient } from "./_testUtils.ts";

Deno.test("generate-mureka: full workflow with lyrics variants", async () => {
  const { userId, accessToken } = await createTestUser();

  // Mock Mureka API responses
  const cleanupMock = installFetchMock({
    "https://api.mureka.ai": async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      
      // Lyrics generation request
      if (url.includes("/v1/lyrics/generate")) {
        return new Response(
          JSON.stringify({
            task_id: "lyrics-task-123",
            data: [
              {
                title: "Summer Vibes",
                text: "[Verse]\nSunshine and good times\n[Chorus]\nFeeling alive",
                status: "completed",
              },
              {
                title: "Summer Dreams",
                text: "[Verse]\nWarm breeze flowing\n[Chorus]\nLiving the moment",
                status: "completed",
              },
            ],
          }),
          { status: 200 }
        );
      }
      
      // Music generation request
      if (url.includes("/v1/song/generate")) {
        return new Response(
          JSON.stringify({
            task_id: "music-task-456",
            status: "pending",
          }),
          { status: 200 }
        );
      }
      
      // Status query
      if (url.includes("/v1/song/query")) {
        return new Response(
          JSON.stringify({
            status: "completed",
            audio_url: "https://cdn.mureka.ai/test.mp3",
            cover_url: "https://cdn.mureka.ai/cover.jpg",
            duration: 180,
          }),
          { status: 200 }
        );
      }

      return new Response("Not found", { status: 404 });
    },
  });

  try {
    // 1. Invoke generate-mureka
    const { data, error } = await adminClient.functions.invoke("generate-mureka", {
      body: {
        prompt: "Uplifting summer pop song",
        hasVocals: true,
        modelVersion: "mureka-o1",
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    assertExists(data);
    assertEquals(error, null);

    // Should require lyrics selection
    if (data.requiresLyricsSelection) {
      assertEquals(data.variants.length, 2);
      assertEquals(data.variants[0].title, "Summer Vibes");

      // 2. Select lyrics variant and continue
      const { data: continueData, error: continueError } = await adminClient.functions.invoke(
        "generate-mureka",
        {
          body: {
            prompt: "Uplifting summer pop song",
            hasVocals: true,
            lyrics: data.variants[0].content,
            modelVersion: "mureka-o1",
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      assertExists(continueData);
      assertEquals(continueError, null);
      assertExists(continueData.trackId);
      assertExists(continueData.taskId);

      // 3. Verify track was created
      const { data: track } = await adminClient
        .from("tracks")
        .select("*")
        .eq("id", continueData.trackId)
        .single();

      assertExists(track);
      assertEquals(track.status, "processing");
      assertEquals(track.provider, "mureka");
    }
  } finally {
    cleanupMock();
  }
});

Deno.test("generate-mureka: BGM mode without lyrics", async () => {
  const { userId, accessToken } = await createTestUser();

  const cleanupMock = installFetchMock({
    "https://api.mureka.ai": async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      
      if (url.includes("/v1/song/generate")) {
        return new Response(
          JSON.stringify({
            task_id: "bgm-task-789",
            status: "pending",
          }),
          { status: 200 }
        );
      }
      
      if (url.includes("/v1/song/query")) {
        return new Response(
          JSON.stringify({
            status: "completed",
            audio_url: "https://cdn.mureka.ai/bgm.mp3",
            duration: 120,
          }),
          { status: 200 }
        );
      }

      return new Response("Not found", { status: 404 });
    },
  });

  try {
    const { data, error } = await adminClient.functions.invoke("generate-mureka", {
      body: {
        prompt: "Calm ambient soundscape",
        isBGM: true,
        hasVocals: false,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    assertExists(data);
    assertEquals(error, null);
    assertExists(data.trackId);

    // Verify track
    const { data: track } = await adminClient
      .from("tracks")
      .select("*")
      .eq("id", data.trackId)
      .single();

    assertExists(track);
    assertEquals(track.has_vocals, false);
  } finally {
    cleanupMock();
  }
});

Deno.test("generate-mureka: race condition handling (task_id update delay)", async () => {
  const { userId, accessToken } = await createTestUser();

  let requestCount = 0;

  const cleanupMock = installFetchMock({
    "https://api.mureka.ai": async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      
      if (url.includes("/v1/song/generate")) {
        requestCount++;
        
        // Simulate delayed response
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        return new Response(
          JSON.stringify({
            task_id: `task-${requestCount}`,
            status: "pending",
          }),
          { status: 200 }
        );
      }

      return new Response("Not found", { status: 404 });
    },
  });

  try {
    // Send two requests quickly (simulate race condition)
    const [result1, result2] = await Promise.all([
      adminClient.functions.invoke("generate-mureka", {
        body: { prompt: "Test 1", isBGM: true },
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      adminClient.functions.invoke("generate-mureka", {
        body: { prompt: "Test 2", isBGM: true },
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    // Both should succeed with different track IDs
    assertExists(result1.data?.trackId);
    assertExists(result2.data?.trackId);
    assertEquals(result1.data.trackId !== result2.data.trackId, true);
  } finally {
    cleanupMock();
  }
});

Deno.test("generate-mureka: error handling - invalid task_id format", async () => {
  const { accessToken } = await createTestUser();

  const cleanupMock = installFetchMock({
    "https://api.mureka.ai": () =>
      new Response(
        JSON.stringify({
          // Invalid response format
          invalid_field: "value",
        }),
        { status: 200 }
      ),
  });

  try {
    const { error } = await adminClient.functions.invoke("generate-mureka", {
      body: {
        prompt: "Test",
        isBGM: true,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    assertExists(error);
    assertEquals(error.message.includes("task_id"), true);
  } finally {
    cleanupMock();
  }
});
