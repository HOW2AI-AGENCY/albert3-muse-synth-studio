import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BalanceRequest {
  provider: "suno";
}

interface SunoBalanceResponse {
  code: number;
  msg: string;
  data: {
    balance: number;
    currency: string;
  };
}

Deno.serve(async (req: any) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider }: BalanceRequest = await req.json();

    if (provider !== "suno") {
      return new Response(
        JSON.stringify({ error: "Only suno provider is supported" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    if (!SUNO_API_KEY) {
      console.error("[get-provider-balance] SUNO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[get-provider-balance] Fetching Suno balance...");

    // Call Suno API to get balance
    const response = await fetch("https://api.sunoapi.org/api/v1/user/balance", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[get-provider-balance] Suno API error: ${response.status} ${response.statusText}`
      );
      const errorText = await response.text();
      console.error(`[get-provider-balance] Error response: ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch balance from Suno API",
          details: errorText 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data: SunoBalanceResponse = await response.json();

    console.log(`[get-provider-balance] Balance fetched: ${data.data.balance} ${data.data.currency}`);

    if (data.code !== 200) {
      console.error(`[get-provider-balance] Suno API returned error code: ${data.code}, msg: ${data.msg}`);
      return new Response(
        JSON.stringify({ 
          error: data.msg || "Failed to fetch balance",
          code: data.code 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        balance: data.data.balance || 0,
        currency: data.data.currency || "credits",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[get-provider-balance] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
