import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = createCorsHeaders();

interface ProxyRequestBody {
  url: string;
}

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    // Restrict to Mureka CDN to avoid becoming an open proxy
    return u.hostname.endsWith("cdn.mureka.ai") || u.hostname.endsWith("mureka.ai");
  } catch {
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url }: ProxyRequestBody = await req.json();
    if (!url || !isAllowedUrl(url)) {
      return new Response(JSON.stringify({ error: "Invalid or disallowed URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("[fetch-audio-proxy] Fetching external audio", { url: url.substring(0, 128) });

    const upstream = await fetch(url, {
      headers: {
        // Some CDNs require a user-agent
        "User-Agent": "Albert3-Muse-Player/1.0 (Deno)",
        "Accept": "audio/*, application/octet-stream",
      },
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      logger.error("[fetch-audio-proxy] Upstream fetch failed", { status: upstream.status, text });
      return new Response(JSON.stringify({ error: `Upstream fetch failed: ${upstream.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    const buf = new Uint8Array(await upstream.arrayBuffer());
    const base64 = encodeBase64(buf);

    return new Response(
      JSON.stringify({ success: true, contentType, base64, size: buf.byteLength }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("[fetch-audio-proxy] Unexpected error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
