import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getSunoBalance } from "../get-balance/index.ts";

const realFetch = globalThis.fetch;

const resolveUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

Deno.test({
  name: "returns balance from primary studio endpoint when available",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    Deno.env.set("SUNO_API_KEY", "test-key");
    Deno.env.delete("SUNO_BALANCE_URL");

    const calls: string[] = [];
    globalThis.fetch = async (input, _init) => {
      const url = resolveUrl(input);
      calls.push(url);
      return new Response(
        JSON.stringify({
          data: {
            balance: 42,
            currency: "credits",
            plan: "studio",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    try {
      const result = await getSunoBalance();
      assertEquals(result.balance, 42);
      assertEquals(result.currency, "credits");
      assertEquals(result.plan, "studio");
      assert(result.endpoint?.includes("studio-api.suno.ai"));
      assertEquals(calls.length, 1);
      assertMatch(calls[0], /https:\/\/studio-api\.suno\.ai\/api\/billing\/info/);
    } finally {
      globalThis.fetch = realFetch;
      Deno.env.delete("SUNO_API_KEY");
    }
  },
});

Deno.test({
  name: "falls back to sunoapi endpoint when studio endpoint fails",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    Deno.env.set("SUNO_API_KEY", "test-key");
    Deno.env.delete("SUNO_BALANCE_URL");

    const calls: string[] = [];
    globalThis.fetch = async (input, _init) => {
      const url = resolveUrl(input);
      calls.push(url);
      if (url.includes("studio-api.suno.ai")) {
        return new Response("upstream error", { status: 502 });
      }
      return new Response(
        JSON.stringify({ code: 200, data: { balance: 13, currency: "credits", plan: "plus" } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    try {
      const result = await getSunoBalance();
      assertEquals(result.balance, 13);
      assertEquals(result.currency, "credits");
      assertEquals(result.plan, "plus");
      assert(result.endpoint?.includes("api.sunoapi.org"));
      assertEquals(calls.length, 2);
    } finally {
      globalThis.fetch = realFetch;
      Deno.env.delete("SUNO_API_KEY");
    }
  },
});

Deno.test({
  name: "returns aggregated error when all endpoints fail",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    Deno.env.set("SUNO_API_KEY", "test-key");
    Deno.env.delete("SUNO_BALANCE_URL");

    globalThis.fetch = async () => new Response("nope", { status: 500 });

    try {
      const result = await getSunoBalance();
      assertEquals(result.balance, 0);
      assertEquals(result.error, "All Suno balance endpoints failed");
      assert(Array.isArray(result.attempts));
      assert(result.attempts!.length >= 2);
    } finally {
      globalThis.fetch = realFetch;
      Deno.env.delete("SUNO_API_KEY");
    }
  },
});

Deno.test({
  name: "returns configuration error when api key missing",
  async fn() {
    Deno.env.delete("SUNO_API_KEY");
    globalThis.fetch = realFetch;

    const result = await getSunoBalance();
    assertEquals(result.balance, 0);
    assertEquals(result.error, "API key not configured");
  },
});
