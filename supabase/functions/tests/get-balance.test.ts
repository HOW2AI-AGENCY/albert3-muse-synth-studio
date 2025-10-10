import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler as getBalanceHandler } from "../get-balance/index.ts";
import { createTestUser, installFetchMock } from "./_testUtils.ts";

Deno.test({
  name: "get-balance returns balance from Suno endpoint",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { accessToken } = await createTestUser();

    const restoreFetch = installFetchMock({
      "https://studio-api.suno.ai/api/billing/info/": () =>
        new Response(JSON.stringify({ code: 503, msg: "legacy endpoint disabled" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      "https://api.sunoapi.org/api/v1/generate/credit": () =>
        new Response(
          JSON.stringify({
            code: 200,
            msg: "success",
            data: 38,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    try {
      const request = new Request("http://localhost/get-balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ provider: "suno" }),
      });

      const response = await getBalanceHandler(request);
      assertEquals(response.status, 200);
      const payload = await response.json();
      assertEquals(payload.provider, "suno");
      assertEquals(payload.balance, 38);
      assertEquals(payload.currency, "credits");
      assertEquals(payload.plan, undefined);
      assertEquals(payload.monthly_limit, undefined);
      assertEquals(payload.monthly_usage, undefined);
      assert(Array.isArray(payload.details?.attempts));
      assertEquals(payload.details.attempts.length, 1);
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "get-balance forwards Suno API authentication headers",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { accessToken } = await createTestUser();

    let capturedHeaders: Headers | undefined;

    const restoreFetch = installFetchMock({
      "https://api.sunoapi.org/api/v1/generate/credit": (_input, init) => {
        capturedHeaders = new Headers(init?.headers ?? {});
        return new Response(
          JSON.stringify({ code: 200, msg: "ok", data: { balance: 12, currency: "credits" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    try {
      const request = new Request("http://localhost/get-balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ provider: "suno" }),
      });

      const response = await getBalanceHandler(request);
      assertEquals(response.status, 200);
      assertExists(capturedHeaders);
      assertEquals(capturedHeaders?.get("authorization"), "Bearer test-suno-key");
      assertEquals(capturedHeaders?.get("x-api-key"), "test-suno-key");
      assertEquals(capturedHeaders?.get("api-key"), "test-suno-key");

      const payload = await response.json();
      assertEquals(payload.provider, "suno");
      assertEquals(payload.balance, 12);
      assertEquals(payload.currency, "credits");
    } finally {
      restoreFetch();
    }
  },
});

Deno.test({
  name: "get-balance reports aggregated error when all Suno endpoints fail",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { accessToken } = await createTestUser();

    const restoreFetch = installFetchMock({
      "https://studio-api.suno.ai/api/billing/info/": () =>
        new Response(JSON.stringify({ code: 503, msg: "legacy endpoint disabled" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      "https://api.sunoapi.org/api/v1/generate/credit": () =>
        new Response(JSON.stringify({ code: 455, msg: "maintenance" }), {
          status: 455,
          headers: { "Content-Type": "application/json" },
        }),
      "https://api.sunoapi.org/api/v1/account/balance": () =>
        new Response(JSON.stringify({ code: 503, msg: "Maintenance" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
    });

    try {
      const request = new Request("http://localhost/get-balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ provider: "suno" }),
      });

      const response = await getBalanceHandler(request);
      assertEquals(response.status, 200);
      const payload = await response.json();
      assertEquals(payload.provider, "suno");
      assertEquals(payload.balance, 0);
      assertEquals(payload.currency, "credits");
      assertExists(payload.error);
      assertStringIncludes(payload.error, "All Suno balance endpoints failed");
      assert(Array.isArray(payload.details?.attempts));
      assertEquals(payload.details.attempts.length, 3);
    } finally {
      restoreFetch();
    }

  },
});
