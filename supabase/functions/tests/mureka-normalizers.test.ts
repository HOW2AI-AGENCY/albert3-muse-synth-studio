/**
 * @fileoverview Unit tests for Mureka Response Normalizers
 * @description Tests for lyrics and music response normalization
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  normalizeMurekaLyricsResponse,
  normalizeMurekaMusicResponse,
} from "../_shared/mureka-normalizers.ts";

Deno.test("Mureka Lyrics Normalizer - Wrapped Response with variants", () => {
  const wrappedResponse = {
    code: 200,
    msg: "success",
    data: {
      task_id: "test-task-123",
      data: [
        { text: "Verse 1\nLyrics here...", title: "Song Title", status: "complete" },
        { text: "Verse 1\nAlternative lyrics...", title: "Song Title Alt", status: "complete" },
      ],
    },
  };

  const result = normalizeMurekaLyricsResponse(wrappedResponse);

  assertEquals(result.success, true);
  assertEquals(result.taskId, "test-task-123");
  assertEquals(result.variants.length, 2);
  assertEquals(result.requiresSelection, true);
  assertEquals(result.variants[0].text, "Verse 1\nLyrics here...");
  assertEquals(result.variants[0].title, "Song Title");
});

Deno.test("Mureka Lyrics Normalizer - Wrapped Response with single variant", () => {
  const wrappedResponse = {
    code: 200,
    msg: "success",
    data: {
      task_id: "test-task-456",
      data: [
        { text: "Only one variant", status: "complete" },
      ],
    },
  };

  const result = normalizeMurekaLyricsResponse(wrappedResponse);

  assertEquals(result.success, true);
  assertEquals(result.requiresSelection, false);
  assertEquals(result.variants.length, 1);
});

Deno.test("Mureka Lyrics Normalizer - Error Response (non-200 code)", () => {
  const errorResponse = {
    code: 400,
    msg: "Invalid prompt",
    data: {},
  };

  const result = normalizeMurekaLyricsResponse(errorResponse);

  assertEquals(result.success, false);
  assertEquals(result.error, "Invalid prompt");
  assertEquals(result.variants.length, 0);
});

Deno.test("Mureka Lyrics Normalizer - Direct Response with lyrics string", () => {
  const directResponse = {
    lyrics: "Direct lyrics text",
    task_id: "direct-task-789",
  };

  const result = normalizeMurekaLyricsResponse(directResponse);

  assertEquals(result.success, true);
  assertEquals(result.taskId, "direct-task-789");
  assertEquals(result.variants.length, 1);
  assertEquals(result.variants[0].text, "Direct lyrics text");
});

Deno.test("Mureka Music Normalizer - Wrapped Response with clips", () => {
  const wrappedResponse = {
    code: 200,
    msg: "success",
    data: {
      task_id: "music-task-123",
      status: "completed",
      clips: [
        {
          id: "clip-1",
          title: "Epic Track",
          audio_url: "https://example.com/audio.mp3",
          image_url: "https://example.com/cover.jpg",
          duration: 180,
          tags: ["epic", "orchestral"],
        },
      ],
    },
  };

  const result = normalizeMurekaMusicResponse(wrappedResponse);

  assertEquals(result.success, true);
  assertEquals(result.taskId, "music-task-123");
  assertEquals(result.status, "completed");
  assertEquals(result.clips.length, 1);
  assertEquals(result.clips[0].title, "Epic Track");
  assertExists(result.clips[0].tags);
  assertEquals(result.clips[0].tags!.length, 2);
});

Deno.test("Mureka Music Normalizer - Error Response", () => {
  const errorResponse = {
    code: 500,
    msg: "Internal server error",
    data: {
      task_id: "failed-task",
    },
  };

  const result = normalizeMurekaMusicResponse(errorResponse);

  assertEquals(result.success, false);
  assertEquals(result.status, "failed");
  assertEquals(result.error, "Internal server error");
  assertEquals(result.clips.length, 0);
});

Deno.test("Mureka Music Normalizer - Direct Response", () => {
  const directResponse = {
    task_id: "direct-music-task",
    status: "processing",
    clips: [
      {
        id: "direct-clip",
        audio_url: "https://example.com/track.mp3",
      },
    ],
  };

  const result = normalizeMurekaMusicResponse(directResponse);

  assertEquals(result.success, true);
  assertEquals(result.taskId, "direct-music-task");
  assertEquals(result.status, "processing");
  assertEquals(result.clips.length, 1);
});

Deno.test("Mureka Lyrics Normalizer - Invalid/Unknown Response Shape", () => {
  const invalidResponse = {
    unexpected: "format",
  };

  const result = normalizeMurekaLyricsResponse(invalidResponse);

  assertEquals(result.success, false);
  assertExists(result.error);
  assertEquals(result.variants.length, 0);
});
