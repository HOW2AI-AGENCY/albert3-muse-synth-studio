import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

interface GenerateLyricsAIRequest {
  prompt: string;
  trackId?: string;
}

interface GenerateLyricsAIResponse {
  success: boolean;
  lyrics: string;
  jobId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const { prompt, trackId } = await req.json() as GenerateLyricsAIRequest;

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logger.info("🎵 [LYRICS-AI] Generating lyrics with Lovable AI", {
      promptLength: prompt.length,
      hasTrackId: !!trackId,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Системный промпт для генерации качественной лирики
    const systemPrompt = `You are a professional lyrics writer. Create song lyrics based on the user's description.

IMPORTANT RULES:
1. Use proper song structure with tags: [Verse 1], [Verse 2], [Chorus], [Pre-Chorus], [Bridge], [Outro], [Intro]
2. Each verse should be 4-8 lines
3. Chorus should be catchy and memorable (3-6 lines)
4. Use rhyme schemes but keep them natural
5. Match the mood, style and theme from the description
6. Write in the language specified or detected from the prompt (Russian or English)
7. Be creative but appropriate
8. Output ONLY the lyrics with structure tags, no additional commentary

Example format:
[Verse 1]
Line 1
Line 2
Line 3
Line 4

[Pre-Chorus]
Line 1
Line 2

[Chorus]
Line 1
Line 2
Line 3

[Verse 2]
...`;

    // Вызов Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Быстрая модель для генерации текста
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.8, // Креативность
        max_tokens: 1500, // Достаточно для полной песни
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logger.error("❌ [LYRICS-AI] AI Gateway error", {
        status: aiResponse.status,
        error: errorText,
      });

      // Handle rate limiting
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Слишком много запросов. Пожалуйста, подождите минуту и попробуйте снова." 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Handle payment required
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Недостаточно кредитов для AI генерации. Пополните баланс в настройках." 
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedLyrics = aiData.choices?.[0]?.message?.content;

    if (!generatedLyrics) {
      throw new Error("No lyrics generated from AI");
    }

    logger.info("✅ [LYRICS-AI] Lyrics generated successfully", {
      lyricsLength: generatedLyrics.length,
      lyricsLines: generatedLyrics.split('\n').length,
    });

    // Автоматически сохраняем результат в трек, если указан trackId
    let jobId: string | undefined;
    if (trackId) {
      try {
        // Используем Supabase service role для обновления трека
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/tracks?id=eq.${trackId}`, {
            method: "PATCH",
            headers: {
              "apikey": SUPABASE_SERVICE_ROLE_KEY,
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              lyrics: generatedLyrics,
              updated_at: new Date().toISOString(),
            }),
          });

          if (updateResponse.ok) {
            logger.info("💾 [LYRICS-AI] Lyrics auto-saved to track", { trackId });
          } else {
            logger.warn("⚠️ [LYRICS-AI] Failed to auto-save lyrics", {
              trackId,
              status: updateResponse.status,
            });
          }
        }
      } catch (saveError) {
        logger.error("❌ [LYRICS-AI] Error auto-saving lyrics", {
          error: saveError instanceof Error ? saveError.message : String(saveError),
        });
        // Не прерываем выполнение, лирика все равно возвращается
      }
    }

    const response: GenerateLyricsAIResponse = {
      success: true,
      lyrics: generatedLyrics,
      jobId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("❌ [LYRICS-AI] Error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
