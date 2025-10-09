import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler as getBalanceHandler } from "../get-balance/index.ts";
import { createTestUser, installFetchMock } from "./_testUtils.ts";

Deno.test({
  name: "get-balance falls back to secondary Suno endpoint",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { accessToken } = await createTestUser();
    const calls: string[] = [];

    const restoreFetch = installFetchMock({
      "https://api.sunoapi.org/api/v1/account/balance": () => {
        calls.push("sunoapi");
        return new Response(JSON.stringify({ code: 401, msg: "Unauthorized" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      "https://studio-api.suno.ai/api/billing/info": () => {
        calls.push("studio");
        return new Response(
          JSON.stringify({
            subscription: { plan: "pro" },
            credits: { monthly: { limit: 50, used: 12 } },
          }),
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
      const payload = await response.json();
      assertEquals(payload.provider, "suno");
      assertEquals(payload.balance, 38);
      assertEquals(payload.currency, "credits");
      assertEquals(payload.plan, "pro");
      assertEquals(payload.monthly_limit, 50);
      assertEquals(payload.monthly_usage, 12);
      assertEquals(calls, ["sunoapi", "studio"]);
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
      "https://api.sunoapi.org/api/v1/account/balance": () =>
        new Response(JSON.stringify({ code: 503, msg: "Maintenance" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      "https://studio-api.suno.ai/api/billing/info": () =>
        new Response("Service Suspended", { status: 503, headers: { "Content-Type": "text/plain" } }),
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
      assertEquals(payload.details.attempts.length, 2);
    } finally {
      restoreFetch();
    }

  },
});
