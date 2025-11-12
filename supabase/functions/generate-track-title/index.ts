/**
 * AI-powered track title generation
 * Analyzes prompt, style, and lyrics to generate creative titles
 * 
 * @version 1.0.0
 * @created 2025-11-12
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { createSupabaseUserClient } from "../_shared/supabase.ts";

const requestSchema = z.object({
  prompt: z.string().optional(),
  lyrics: z.string().optional(),
  styleTags: z.array(z.string()).optional(),
  genre: z.string().optional(),
  mood: z.string().optional(),
});

async function handler(req: Request) {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validation.error.format(),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, lyrics, styleTags, genre, mood } = validation.data;

    // Build AI prompt for title generation
    const lyricsPreview = lyrics ? lyrics.slice(0, 300) : '';
    const styleInfo = styleTags?.join(', ') || genre || mood || 'unknown';

    const aiPrompt = `Generate a creative, catchy, and relevant song title based on:

**Prompt:** ${prompt || 'Not provided'}
**Style/Genre:** ${styleInfo}
**Lyrics Preview:** ${lyricsPreview || 'Not provided'}

Requirements:
- Title must be 2-5 words
- Catchy and memorable
- Reflects the mood/genre
- Avoids clichés
- Professional and marketable

Return ONLY the title, nothing else.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://api.lovable.app/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "You are a creative music industry expert specializing in track naming. Generate concise, catchy titles.",
          },
          {
            role: "user",
            content: aiPrompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 20,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logger.error("Lovable AI request failed", new Error(errorText), "generate-track-title");
      throw new Error("Failed to generate title");
    }

    const aiData = await aiResponse.json();
    const generatedTitle = aiData.choices?.[0]?.message?.content?.trim();

    if (!generatedTitle) {
      throw new Error("No title generated");
    }

    // Clean up title (remove quotes, extra spaces)
    const cleanTitle = generatedTitle
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    logger.info("Title generated", "generate-track-title", {
      userId: user.id,
      title: cleanTitle,
    });

    return new Response(
      JSON.stringify({
        success: true,
        title: cleanTitle,
        suggestions: [cleanTitle], // Can add multiple suggestions in future
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("Unexpected error", error as Error, "generate-track-title");
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

if (import.meta.main) {
  serve(handler);
}
