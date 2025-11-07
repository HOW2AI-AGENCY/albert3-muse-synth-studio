/**
 * Mureka Webhook Handler
 *
 * Receives callbacks from Mureka API when generation tasks complete.
 * Updates track status and URLs in the database.
 *
 * Security: HMAC-SHA256 signature verification for webhook authenticity
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateAndParse } from "../_shared/zod-schemas.ts";
import { verifyWebhookSignature } from "../_shared/webhook-verify.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

// Webhook payload schema from Mureka
const MurekaWebhookSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.object({
    task_id: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    clips: z.array(z.object({
      id: z.string(),
      audio_url: z.string(),
      image_url: z.string().optional(),
      video_url: z.string().optional(),
      title: z.string(),
      lyrics: z.string().optional(),
      duration: z.number(),
      created_at: z.string(),
      metadata: z.record(z.unknown()).optional(),
    })).optional(),
    error: z.string().optional(),
  }),
});

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ✅ P0-3 FIX: Webhook signature verification
    const signature = req.headers.get('X-Mureka-Signature');
    const MUREKA_WEBHOOK_SECRET = Deno.env.get('MUREKA_WEBHOOK_SECRET');

    // Read body as text first for signature verification
    const bodyText = await req.text();

    if (MUREKA_WEBHOOK_SECRET) {
      if (!signature) {
        logger.error('Missing webhook signature', new Error('Missing X-Mureka-Signature header'), 'mureka-webhook');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing webhook signature'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const isValid = await verifyWebhookSignature(bodyText, signature, MUREKA_WEBHOOK_SECRET);

      if (!isValid) {
        logger.error('Invalid webhook signature', new Error('Signature verification failed'), 'mureka-webhook');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid webhook signature'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      logger.info('✅ [MUREKA-WEBHOOK] Signature verified successfully', { hasSignature: true });
    } else {
      logger.warn('⚠️ [MUREKA-WEBHOOK] MUREKA_WEBHOOK_SECRET not configured - skipping signature verification', { production: Deno.env.get('DENO_ENV') === 'production' });
    }

    // Parse and validate webhook payload
    const rawBody = JSON.parse(bodyText);
    
    logger.info('📥 [MUREKA-WEBHOOK] Received webhook', { 
      taskId: rawBody?.data?.task_id,
      status: rawBody?.data?.status 
    });

    const validation = validateAndParse(MurekaWebhookSchema, rawBody);
    if (!validation.success) {
      logger.warn('Invalid webhook payload', { errors: validation.errors.errors });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid webhook payload', 
          details: validation.errors.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const webhook = validation.data;
    const supabaseAdmin = createSupabaseAdminClient();

    // Find track by mureka task_id
    const { data: track, error: findError } = await supabaseAdmin
      .from('tracks')
      .select('id, user_id, title, status, metadata')
      .eq('suno_id', webhook.data.task_id) // We reuse suno_id field for mureka task_id
      .single();

    if (findError || !track) {
      logger.warn('Track not found for task_id', {
        taskId: webhook.data.task_id,
        error: findError
      });

      // ⚡ OPTIMIZATION: Return 202 to trigger retry (like Suno)
      // 202 = "Accepted, but not yet processed" - tells Mureka to retry later
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Track not found but webhook acknowledged',
          retry: true
        }),
        {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    logger.info('✅ [MUREKA-WEBHOOK] Track found', { 
      trackId: track.id, 
      userId: track.user_id,
      currentStatus: track.status 
    });

    // Handle webhook based on status
    if (webhook.data.status === 'completed' && webhook.data.clips && webhook.data.clips.length > 0) {
      // Update track with completed data (use first clip)
      const clip = webhook.data.clips[0];
      
      const { error: updateError } = await supabaseAdmin
        .from('tracks')
        .update({
          status: 'completed',
          audio_url: clip.audio_url,
          cover_url: clip.image_url,
          video_url: clip.video_url,
          duration: clip.duration,
          lyrics: clip.lyrics || track.title, // Fallback to title if no lyrics
          metadata: {
            ...(track.metadata as Record<string, unknown> || {}),
            mureka_clip_id: clip.id,
            webhook_received_at: new Date().toISOString(),
            clips_count: webhook.data.clips.length,
          },
        })
        .eq('id', track.id);

      if (updateError) {
        logger.error('Failed to update track', { error: updateError, trackId: track.id });
        throw updateError;
      }

      // ⚡ OPTIMIZATION: Store additional variants with idempotency
      if (webhook.data.clips.length > 1) {
        // Check existing versions to avoid duplicates (idempotency)
        const { data: existingVersions } = await supabaseAdmin
          .from('track_versions')
          .select('variant_index, metadata->mureka_clip_id')
          .eq('parent_track_id', track.id);

        const existingClipIds = new Set(
          (existingVersions || [])
            .map((v: any) => v.metadata?.mureka_clip_id)
            .filter(Boolean)
        );

        const variants = webhook.data.clips
          .slice(1)
          .filter((clip) => !existingClipIds.has(clip.id)) // Skip existing
          .map((clip, index) => ({
            parent_track_id: track.id,
            variant_index: index + 1, // ✅ FIX: Use variant_index (not version_number)
            is_primary_variant: false,
            is_preferred_variant: index === 0, // First additional variant is preferred
            audio_url: clip.audio_url,
            cover_url: clip.image_url,
            video_url: clip.video_url,
            duration: clip.duration,
            lyrics: clip.lyrics,
            metadata: {
              mureka_clip_id: clip.id,
              webhook_received_at: new Date().toISOString(),
            },
          }));

        if (variants.length > 0) {
          // ✅ FIX: Use upsert for idempotency
          const { error: variantsError } = await supabaseAdmin
            .from('track_versions')
            .upsert(variants, { onConflict: 'parent_track_id,variant_index' });

          if (variantsError) {
            logger.warn('Failed to insert track variants', {
              error: variantsError,
              trackId: track.id
            });
          } else {
            logger.info('✅ [MUREKA-WEBHOOK] Stored variants', {
              trackId: track.id,
              count: variants.length
            });
          }
        }
      }

      logger.info('✅ [MUREKA-WEBHOOK] Track updated successfully', { 
        trackId: track.id,
        audioUrl: clip.audio_url,
        duration: clip.duration,
      });

    } else if (webhook.data.status === 'failed') {
      // Update track as failed
      const { error: updateError } = await supabaseAdmin
        .from('tracks')
        .update({
          status: 'failed',
          metadata: {
            ...(track.metadata as Record<string, unknown> || {}),
            error_message: webhook.data.error || 'Generation failed',
            webhook_received_at: new Date().toISOString(),
          },
        })
        .eq('id', track.id);

      if (updateError) {
        logger.error('Failed to update track as failed', { 
          error: updateError, 
          trackId: track.id 
        });
        throw updateError;
      }

      logger.warn('⚠️ [MUREKA-WEBHOOK] Track marked as failed', { 
        trackId: track.id,
        error: webhook.data.error 
      });

    } else {
      // Processing status - just log
      logger.info('📊 [MUREKA-WEBHOOK] Track still processing', { 
        trackId: track.id,
        status: webhook.data.status 
      });
    }

    const duration = Date.now() - startTime;
    logger.info('✅ [MUREKA-WEBHOOK] Webhook processed', { 
      taskId: webhook.data.task_id,
      trackId: track.id,
      status: webhook.data.status,
      duration: `${duration}ms` 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        trackId: track.id,
        status: webhook.data.status,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;
    
    logger.error('🔴 [MUREKA-WEBHOOK] Processing error', { 
      error,
      duration: `${duration}ms` 
    });

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMsg 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
