import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createCorsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';

const corsHeaders = createCorsHeaders();

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jobId, variantId, title, tags, folder, description } = await req.json();

    if (!variantId && !title) {
      return new Response(
        JSON.stringify({ error: 'Either variantId or title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let lyricsData: any = {};

    // If variantId provided, fetch from lyrics_variants
    if (variantId) {
      const { data: variant, error: variantError } = await supabase
        .from('lyrics_variants')
        .select('content, title')
        .eq('id', variantId)
        .single();

      if (variantError || !variant) {
        return new Response(
          JSON.stringify({ error: 'Variant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      lyricsData = {
        content: variant.content,
        title: variant.title || title || 'Untitled',
      };
    }

    // Get prompt from job if provided
    let prompt = null;
    if (jobId) {
      const { data: job } = await supabase
        .from('lyrics_jobs')
        .select('prompt')
        .eq('id', jobId)
        .single();

      if (job) {
        prompt = job.prompt;
      }
    }

    // Check if already saved
    if (variantId) {
      const { data: existing } = await supabase
        .from('saved_lyrics')
        .select('id')
        .eq('variant_id', variantId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            id: existing.id,
            message: 'Already saved' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert into saved_lyrics
    const { data: savedLyrics, error: insertError } = await supabase
      .from('saved_lyrics')
      .insert({
        user_id: user.id,
        job_id: jobId || null,
        variant_id: variantId || null,
        title: lyricsData.title || title,
        content: lyricsData.content || '',
        prompt,
        tags: tags || [],
        folder: folder || null,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error saving lyrics', insertError, 'save-lyrics');
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: savedLyrics }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error in save-lyrics function', error instanceof Error ? error : new Error(String(error)), 'save-lyrics');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});