/**
 * @fileoverview Suno Persona Generation Edge Function
 * @description Создает музыкальную персону (Persona) из сгенерированного трека Suno
 * @version 1.0.0
 * @since 2025-11-01
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { logger } from '../_shared/logger.ts';
import { createSupabaseUserClient } from '../_shared/supabase.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================================
// TYPES
// ============================================================================

interface CreatePersonaRequest {
  trackId: string;
  musicIndex: number;
  name: string;
  description: string;
  isPublic?: boolean;
}

interface SunoPersonaResponse {
  code: number;
  msg: string;
  data?: {
    personaId: string;
    name: string;
    description: string;
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let ctxTrackId: string | undefined;
  try {
    // ============================================================================
    // AUTHENTICATION
    // ============================================================================

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      logger.error('Authentication failed', userError ?? new Error('Unauthorized'));
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================================
    // VALIDATE REQUEST
    // ============================================================================

    const body: CreatePersonaRequest = await req.json();
    const { trackId, musicIndex, name, description, isPublic = false } = body;
    ctxTrackId = trackId;

    if (!trackId || musicIndex === undefined || !name || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: trackId, musicIndex, name, description' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate field lengths
    if (name.length < 1 || name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Name must be between 1 and 100 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (description.length < 1 || description.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Description must be between 1 and 500 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    logger.info('Create persona request', { endpoint: 'create-suno-persona', trackId, musicIndex, name, userId: user.id });

    // ============================================================================
    // FETCH TRACK DATA
    // ============================================================================

    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .eq('user_id', user.id)
      .single();

    if (trackError || !track) {
      return new Response(
        JSON.stringify({ error: 'Track not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify track is from Suno
    if (track.provider !== 'suno') {
      return new Response(
        JSON.stringify({ error: 'Persona can only be created from Suno AI tracks' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify track is completed
    if (track.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Track must be completed before creating persona' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Suno task ID from metadata
    const metadata = track.metadata as Record<string, unknown> || {};
    const sunoTaskId = metadata.suno_task_id as string || track.idempotency_key;

    if (!sunoTaskId) {
      return new Response(
        JSON.stringify({ error: 'Missing Suno task ID in track metadata' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    logger.info('Track found', { endpoint: 'create-suno-persona', trackId, sunoTaskId, provider: track.provider });

    // ============================================================================
    // CALL SUNO API
    // ============================================================================

    const SUNO_API_KEY = (globalThis as any).Deno?.env?.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate/generate-persona', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: sunoTaskId,
        musicIndex,
        name,
        description,
      }),
    });

    const sunoData: SunoPersonaResponse = await sunoResponse.json();

    logger.info('Suno API response', { endpoint: 'create-suno-persona', status: sunoResponse.status, code: sunoData.code, msg: sunoData.msg });

    // Handle Suno API errors
    if (!sunoResponse.ok || sunoData.code !== 200) {
      const errorMsg = sunoData.msg || 'Failed to create persona with Suno API';
      
      // Map Suno error codes to user-friendly messages
      if (sunoData.code === 409) {
        return new Response(
          JSON.stringify({ error: 'Persona already exists for this music' }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (sunoData.code === 402) {
        return new Response(
          JSON.stringify({ error: 'Insufficient Suno AI credits' }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: errorMsg }),
        {
          status: sunoResponse.status || 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!sunoData.data?.personaId) {
      throw new Error('Invalid response from Suno API: missing personaId');
    }

    const { personaId } = sunoData.data;

    // ============================================================================
    // SAVE PERSONA TO DATABASE
    // ============================================================================

    const { data: persona, error: saveError } = await supabase
      .from('suno_personas')
      .insert({
        user_id: user.id,
        suno_persona_id: personaId,
        source_track_id: trackId,
        source_suno_task_id: sunoTaskId,
        source_music_index: musicIndex,
        name,
        description,
        cover_image_url: track.cover_url || null,
        is_public: isPublic,
        metadata: {
          created_via: 'edge_function',
          suno_response: sunoData.data,
          track_title: track.title,
          track_style_tags: track.style_tags,
        },
      })
      .select()
      .single();

    if (saveError) {
      logger.error('Database error', saveError instanceof Error ? saveError : new Error(String(saveError)));
      return new Response(JSON.stringify({ error: 'Failed to save persona' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.info('Persona created successfully', { endpoint: 'create-suno-persona', personaId: persona.id });

    // ============================================================================
    // RETURN SUCCESS
    // ============================================================================

    return new Response(
      JSON.stringify({
        success: true,
        persona: {
          id: persona.id,
          sunoPersonaId: persona.suno_persona_id,
          name: persona.name,
          description: persona.description,
          coverImageUrl: persona.cover_image_url,
          isPublic: persona.is_public,
          sourceTrackId: persona.source_track_id,
          createdAt: persona.created_at,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error in create-suno-persona', err);

    // Provide safer, consistent error payload and include trackId context if available
    return new Response(
      JSON.stringify({
        error: err.message || 'Internal server error',
        trackId: ctxTrackId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});