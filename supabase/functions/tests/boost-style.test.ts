/**
 * @fileoverview Unit tests for boost-style edge function
 * @version 1.0.0
 * @since 2025-11-01
 */

import { createTestUser, installFetchMock } from "./_testUtils.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";

// ============================================================================
// TEST: Validation
// ============================================================================

Deno.test("boost-style: should reject empty content", async () => {
  const { accessToken } = await createTestUser();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: "" }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error, "Content is required");
});

Deno.test("boost-style: should reject whitespace-only content", async () => {
  const { accessToken } = await createTestUser();

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: "   " }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertEquals(data.error, "Content is required");
});

Deno.test("boost-style: should reject content over 250 characters", async () => {
  const { accessToken } = await createTestUser();
  const longContent = "A".repeat(251);

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: longContent }),
  });

  assertEquals(response.status, 413);
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error.includes("too long"), true);
});

Deno.test("boost-style: should require authorization", async () => {
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: "Test style" }),
  });

  assertEquals(response.status, 500); // Will fail auth check
  const data = await response.json();
  assertExists(data.error);
});

// ============================================================================
// TEST: Success Cases
// ============================================================================

Deno.test("boost-style: should successfully boost valid style description", async () => {
  const { accessToken } = await createTestUser();

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/style/generate": () => {
      return new Response(
        JSON.stringify({
          code: 200,
          msg: "Success",
          data: {
            taskId: "test-task-123",
            param: "upbeat electronic music",
            result: "Energetic electronic dance music with pulsing synths and driving beats",
            creditsConsumed: 1,
            creditsRemaining: 99,
            successFlag: "成功",
            createTime: "2025-11-01T10:00:00Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "upbeat electronic music" }),
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    assertEquals(data.success, true);
    assertEquals(data.result, "Energetic electronic dance music with pulsing synths and driving beats");
    assertEquals(data.creditsConsumed, 1);
    assertEquals(data.creditsRemaining, 99);
    assertExists(data.taskId);
  } finally {
    uninstall();
  }
});

Deno.test("boost-style: should handle content at max length (250 chars)", async () => {
  const { accessToken } = await createTestUser();
  const maxContent = "A".repeat(250);

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/style/generate": () => {
      return new Response(
        JSON.stringify({
          code: 200,
          msg: "Success",
          data: {
            taskId: "test-task-456",
            param: maxContent,
            result: "Boosted style description",
            creditsConsumed: 1,
            creditsRemaining: 98,
            successFlag: "成功",
            createTime: "2025-11-01T10:00:00Z",
          },
        }),
        { status: 200 }
      );
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: maxContent }),
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    assertEquals(data.success, true);
  } finally {
    uninstall();
  }
});

// ============================================================================
// TEST: Error Handling
// ============================================================================

Deno.test("boost-style: should handle Suno API rate limit (429)", async () => {
  const { accessToken } = await createTestUser();

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/style/generate": () => {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "Test style" }),
    });

    assertEquals(response.status, 429);
    const data = await response.json();
    assertExists(data.error);
    assertEquals(data.code, 429);
  } finally {
    uninstall();
  }
});

Deno.test("boost-style: should handle Suno API content too long (413)", async () => {
  const { accessToken } = await createTestUser();

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/style/generate": () => {
      return new Response(JSON.stringify({ error: "Content too long" }), { status: 413 });
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "Test style" }),
    });

    assertEquals(response.status, 413);
    const data = await response.json();
    assertExists(data.error);
  } finally {
    uninstall();
  }
});

Deno.test("boost-style: should handle Suno API maintenance (455)", async () => {
  const { accessToken } = await createTestUser();

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/style/generate": () => {
      return new Response(JSON.stringify({ error: "Service under maintenance" }), { status: 455 });
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "Test style" }),
    });

    assertEquals(response.status, 503);
    const data = await response.json();
    assertExists(data.error);
  } finally {
    uninstall();
  }
});

Deno.test("boost-style: should handle Suno API error response with errorMessage", async () => {
  const { accessToken } = await createTestUser();

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/style/generate": () => {
      return new Response(
        JSON.stringify({
          code: 200,
          msg: "Success",
          data: {
            taskId: "test-task-error",
            param: "test",
            result: "",
            creditsConsumed: 0,
            creditsRemaining: 100,
            successFlag: "失败",
            errorCode: 500,
            errorMessage: "Invalid style description format",
            createTime: "2025-11-01T10:00:00Z",
          },
        }),
        { status: 200 }
      );
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "test" }),
    });

    assertEquals(response.status, 400);
    const data = await response.json();
    assertExists(data.error);
    assertEquals(data.error, "Invalid style description format");
    assertEquals(data.code, 500);
  } finally {
    uninstall();
  }
});

Deno.test("boost-style: should handle Suno API non-200 code response", async () => {
  const { accessToken } = await createTestUser();

  const uninstall = installFetchMock({
    "https://api.sunoapi.org/api/v1/style/generate": () => {
      return new Response(
        JSON.stringify({
          code: 400,
          msg: "Bad request",
          data: null,
        }),
        { status: 200 }
      );
    },
  });

  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "test" }),
    });

    assertEquals(response.status, 400);
    const data = await response.json();
    assertExists(data.error);
  } finally {
    uninstall();
  }
});

// ============================================================================
// TEST: CORS
// ============================================================================

Deno.test("boost-style: should handle OPTIONS preflight request", async () => {
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/boost-style`, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
  assertExists(response.headers.get("Access-Control-Allow-Headers"));
});
