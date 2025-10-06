import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { validateRequest, validationSchemas } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || 'https://localhost:3000',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  ...createSecurityHeaders()
};

const mainHandler = async (req: Request): Promise<Response> => {
  try {
    // Валидация входных данных
    const validatedData = await validateRequest(req, validationSchemas.generateLyrics)
    
    // Получение пользователя из JWT токена
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { theme, mood, genre, language, structure } = validatedData
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    // Create the lyrics generation prompt
    const prompt = `Generate song lyrics with the following specifications:
    Theme: ${theme}
    Mood: ${mood}
    Genre: ${genre}
    Language: ${language}
    Structure: ${structure}
    
    Please create original, creative lyrics that match these requirements.`

    console.log('Generating lyrics with params:', { theme, mood, genre, language, structure })

    // Call Lovable API for lyrics generation
    const response = await fetch('https://lovableapi.com/api/lyrics/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        theme,
        mood,
        genre,
        language,
        structure
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Lovable API error:', response.status, errorText)
      throw new Error(`Lovable API error: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const generatedLyrics = result.lyrics || result.text || 'No lyrics generated'

    console.log('Lyrics generated successfully');

    return new Response(
      JSON.stringify({ 
        lyrics: generatedLyrics,
        metadata: { theme, mood, genre, language, structure }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-lyrics function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Применяем rate limiting middleware
const handler = withRateLimit(mainHandler, {
  maxRequests: 20,
  windowMinutes: 1,
  endpoint: 'generate-lyrics'
});

serve(handler);
