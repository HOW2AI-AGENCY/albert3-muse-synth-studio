import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export type FetchResponder = (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
  throw new Error("Supabase test environment variables are not configured. Ensure 'supabase test' is running.");
}

// Normalise environment variables for the function runtime
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE);
Deno.env.set("SUPABASE_SERVICE_ROLE", SERVICE_ROLE);

if (!Deno.env.get("SUNO_API_KEY")) {
  Deno.env.set("SUNO_API_KEY", "test-suno-key");
}
if (!Deno.env.get("SUNO_API_BASE_URL")) {
  Deno.env.set("SUNO_API_BASE_URL", "https://api.sunoapi.org");
}

export const adminClient: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE);
export const anonClient: SupabaseClient = createClient(SUPABASE_URL, ANON_KEY);

const realFetch = globalThis.fetch;

export const installFetchMock = (responders: Record<string, FetchResponder>): (() => void) => {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

    for (const [prefix, handler] of Object.entries(responders)) {
      if (url.startsWith(prefix)) {
        return handler(input, init);
      }
    }

    return realFetch(input as Request, init);
  };

  return () => {
    globalThis.fetch = realFetch;
  };
};

export const createTestUser = async (): Promise<{ userId: string; accessToken: string }> => {
  const email = `test-${crypto.randomUUID()}@example.com`;
  const password = `Test-${crypto.randomUUID()}`;

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`);
  }

  const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({ email, password });
  if (signInError || !sessionData.session?.access_token) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  return {
    userId: created.user.id,
    accessToken: sessionData.session.access_token,
  };
};

// A valid JWT for testing purposes (content doesn't matter, just needs to exist)
export const VALID_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// Mocks the Supabase user authentication call
export const mockSupabaseUser = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  return installFetchMock({
    [`${supabaseUrl}/auth/v1/user`]: () =>
      new Response(
        JSON.stringify({
          id: "test-user-id",
          aud: "authenticated",
          role: "authenticated",
          email: "test@example.com",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
  });
};
