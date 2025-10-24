import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
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

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const audioId = pathParts[pathParts.length - 1];

    // GET - List or get single
    if (req.method === 'GET') {
      if (audioId && audioId !== 'audio-library') {
        const { data, error } = await supabase
          .from('audio_library')
          .select('*')
          .eq('id', audioId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // List with filters
      const sourceType = url.searchParams.get('source_type');
      const folder = url.searchParams.get('folder');
      const favorite = url.searchParams.get('favorite');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('audio_library')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }
      if (folder) {
        query = query.eq('folder', folder);
      }
      if (favorite === 'true') {
        query = query.eq('is_favorite', true);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data, count }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Create new audio entry
    if (req.method === 'POST') {
      const { 
        fileName, 
        fileUrl, 
        fileSize, 
        durationSeconds, 
        sourceType, 
        sourceMetadata,
        tags, 
        folder, 
        description 
      } = await req.json();

      if (!fileName || !fileUrl || !sourceType) {
        return new Response(
          JSON.stringify({ error: 'fileName, fileUrl, and sourceType are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('audio_library')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_url: fileUrl,
          file_size: fileSize || null,
          duration_seconds: durationSeconds || null,
          source_type: sourceType,
          source_metadata: sourceMetadata || {},
          tags: tags || [],
          folder: folder || null,
          description: description || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating audio entry:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH - Update audio entry
    if (req.method === 'PATCH') {
      if (!audioId || audioId === 'audio-library') {
        return new Response(
          JSON.stringify({ error: 'Audio ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updates = await req.json();
      delete updates.id;
      delete updates.user_id;
      delete updates.created_at;

      const { data, error } = await supabase
        .from('audio_library')
        .update(updates)
        .eq('id', audioId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Remove audio entry
    if (req.method === 'DELETE') {
      if (!audioId || audioId === 'audio-library') {
        return new Response(
          JSON.stringify({ error: 'Audio ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('audio_library')
        .delete()
        .eq('id', audioId)
        .eq('user_id', user.id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in audio-library function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});