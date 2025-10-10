import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const importWithOrigins = async (origins: string) => {
  if (origins) {
    Deno.env.set("CORS_ALLOWED_ORIGINS", origins);
  } else {
    Deno.env.delete("CORS_ALLOWED_ORIGINS");
  }

  const module = await import(`./cors.ts?cachebust=${crypto.randomUUID()}`);
  return module as typeof import("./cors.ts");
};

Deno.test("matches wildcard preview origins", async () => {
  try {
    const { createCorsHeaders } = await importWithOrigins("https://id-preview--*.lovable.app");

    const headers = createCorsHeaders("https://id-preview--123.example.lovable.app");

    assertEquals(headers["Access-Control-Allow-Origin"], "https://id-preview--123.example.lovable.app");
    assertEquals(headers["Vary"], "Origin");
  } finally {
    Deno.env.delete("CORS_ALLOWED_ORIGINS");
  }
});

Deno.test("rejects unrelated origins", async () => {
  try {
    const { createCorsHeaders } = await importWithOrigins("https://id-preview--*.lovable.app,https://lovable.app");

    const headers = createCorsHeaders("https://malicious.example.com");

    assertNotEquals(headers["Access-Control-Allow-Origin"], "https://malicious.example.com");
    assertEquals(headers["Access-Control-Allow-Origin"], "https://id-preview--*.lovable.app");
  } finally {
    Deno.env.delete("CORS_ALLOWED_ORIGINS");
  }
});

Deno.test("omits credentials header when default wildcard origin is used", async () => {
  try {
    const { createCorsHeaders } = await importWithOrigins("");

    const headers = createCorsHeaders();

    assertEquals(headers["Access-Control-Allow-Origin"], "*");
    assertEquals(headers["Access-Control-Allow-Credentials"], undefined);
  } finally {
    Deno.env.delete("CORS_ALLOWED_ORIGINS");
  }
});
