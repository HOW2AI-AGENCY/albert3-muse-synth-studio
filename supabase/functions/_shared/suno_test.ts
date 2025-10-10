const assertEquals = (
  actual: unknown,
  expected: unknown,
  message?: string,
): void => {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      message ??
        `Assertion failed: expected ${expectedJson} but received ${actualJson}`,
    );
  }
};

Deno.test({
  name: "comma separated SUNO_GENERATE_URL expands to multiple endpoints",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const original = Deno.env.get("SUNO_GENERATE_URL");
    Deno.env.set(
      "SUNO_GENERATE_URL",
      "https://primary.suno.test/api , https://secondary.suno.test/api/",
    );

    try {
      const moduleUrl =
        new URL(`./suno.ts?split=${crypto.randomUUID()}`, import.meta.url).href;
      const { createSunoClient } = await import(moduleUrl);

      const attempted: string[] = [];
      const fetchImpl: typeof fetch = async (input, init) => {
        const endpoint = typeof input === "string"
          ? input
          : input instanceof URL
          ? input.href
          : input.url;

        attempted.push(endpoint);

        if (attempted.length < 3) {
          return new Response(JSON.stringify({ message: "fail" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ data: { taskId: "task-split" } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      };

      const client = createSunoClient({ apiKey: "test-key", fetchImpl });
      const result = await client.generateTrack({ prompt: "Test prompt" });

      assertEquals(result.endpoint, "https://api.sunoapi.org/api/v1/generate");
      assertEquals(attempted, [
        "https://primary.suno.test/api",
        "https://secondary.suno.test/api",
        "https://api.sunoapi.org/api/v1/generate",
      ]);
    } finally {
      if (original === undefined) {
        Deno.env.delete("SUNO_GENERATE_URL");
      } else {
        Deno.env.set("SUNO_GENERATE_URL", original);
      }
    }
  },
});
