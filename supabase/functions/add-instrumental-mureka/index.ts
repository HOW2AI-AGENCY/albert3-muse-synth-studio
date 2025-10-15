import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';
import { createSupabaseUserClient, createSupabaseAdminClient } from '../_shared/supabase.ts';
import { logger } from '../_shared/logger.ts';
import { createMurekaClient } from '../_shared/mureka.ts';

const corsHeaders = createCorsHeaders();

interface AddInstrumentalMurekaRequest {
  uploadUrl: string;
  title: string;
  prompt: string;
  model?: 'chirp-v4';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('🔴 [ADD-INSTRUMENTAL-MUREKA] Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseUserClient(token);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error('🔴 [ADD-INSTRUMENTAL-MUREKA] Unauthorized', { error: userError });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    logger.info('🎵 [ADD-INSTRUMENTAL-MUREKA] Request from user', { userId: user.id });

    const body: AddInstrumentalMurekaRequest = await req.json();
    
    if (!body.uploadUrl || !body.title || !body.prompt) {
      logger.error('🔴 [ADD-INSTRUMENTAL-MUREKA] Missing required fields', { 
        hasUploadUrl: !!body.uploadUrl, 
        hasTitle: !!body.title, 
        hasPrompt: !!body.prompt
      });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: uploadUrl, title, prompt' 
      }), {
        status: 400,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    logger.info('🎵 [ADD-INSTRUMENTAL-MUREKA] Starting add-instrumental', { 
      uploadUrl: body.uploadUrl, 
      title: body.title,
      prompt: body.prompt
    });

    const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
    if (!MUREKA_API_KEY) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });

    // Step 1: Download audio from uploadUrl
    logger.info('📥 [ADD-INSTRUMENTAL-MUREKA] Downloading audio', { uploadUrl: body.uploadUrl });
    
    const audioResponse = await fetch(body.uploadUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBlob = await audioResponse.blob();
    logger.info('✅ [ADD-INSTRUMENTAL-MUREKA] Audio downloaded', { size: audioBlob.size });

    // Step 2: Upload to Mureka
    logger.info('📤 [ADD-INSTRUMENTAL-MUREKA] Uploading to Mureka');
    
    const uploadResult = await murekaClient.uploadFile(audioBlob);
    const fileId = uploadResult.data.file_id;
    
    logger.info('✅ [ADD-INSTRUMENTAL-MUREKA] File uploaded to Mureka', { fileId });

    // Step 3: Generate song with instrumental prompt
    // According to Mureka API: use empty lyrics for instrumental generation
    logger.info('🎹 [ADD-INSTRUMENTAL-MUREKA] Generating instrumental');
    
    const generateResult = await murekaClient.generateSong({
      lyrics: '', // Empty lyrics = instrumental
      prompt: body.prompt,
      model: body.model || 'chirp-v4',
    });

    const taskId = generateResult.data.task_id;
    
    logger.info('✅ [ADD-INSTRUMENTAL-MUREKA] Task created', { taskId });

    // Step 4: Create track record
    const supabaseAdmin = createSupabaseAdminClient();
    
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .insert({
        user_id: user.id,
        title: body.title,
        prompt: body.prompt,
        status: 'processing',
        provider: 'mureka',
        model_name: body.model || 'chirp-v4',
        has_vocals: false, // Result will be instrumental
        metadata: {
          operation: 'add_instrumental',
          mureka_task_id: taskId,
          mureka_file_id: fileId,
          upload_url: body.uploadUrl,
        }
      })
      .select()
      .single();

    if (trackError) {
      logger.error('🔴 [ADD-INSTRUMENTAL-MUREKA] Failed to create track', { error: trackError });
      throw trackError;
    }

    logger.info('✅ [ADD-INSTRUMENTAL-MUREKA] Track record created', { 
      trackId: track.id, 
      murekaTaskId: taskId 
    });

    // Step 5: Start background polling
    pollMurekaInstrumental(taskId, track.id);

    return new Response(JSON.stringify({
      success: true,
      trackId: track.id,
      murekaTaskId: taskId,
      fileId
    }), {
      status: 200,
      headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('🔴 [ADD-INSTRUMENTAL-MUREKA] Unexpected error', { 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
    });
  }
});

// Background polling function
async function pollMurekaInstrumental(taskId: string, trackId: string) {
  const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
  if (!MUREKA_API_KEY) {
    logger.error('🔴 [POLL-MUREKA-INSTRUMENTAL] Missing API key');
    return;
  }

  const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
  const supabaseAdmin = createSupabaseAdminClient();
  
  const MAX_ATTEMPTS = 60; // 5 minutes max (5s intervals)
  const POLL_INTERVAL = 5000; // 5 seconds

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.debug('🔍 [POLL-MUREKA-INSTRUMENTAL] Polling', { taskId, attempt });

      const result = await murekaClient.queryTask(taskId);

      // Check if completed
      if (result.data.clips && result.data.clips.length > 0) {
        const track = result.data.clips[0];
        
        logger.info('✅ [POLL-MUREKA-INSTRUMENTAL] Task completed', { 
          taskId, 
          trackId,
          audioUrl: track.audio_url 
        });

        // Update track in database
        const { error: updateError } = await supabaseAdmin
          .from('tracks')
          .update({
            status: 'completed',
            audio_url: track.audio_url,
            cover_url: track.image_url,
            duration: track.duration,
            metadata: {
              operation: 'add_instrumental',
              mureka_task_id: taskId,
              mureka_audio_id: track.id,
              completed_at: new Date().toISOString(),
            }
          })
          .eq('id', trackId);

        if (updateError) {
          logger.error('🔴 [POLL-MUREKA-INSTRUMENTAL] Failed to update track', { 
            error: updateError 
          });
        }

        return; // Done
      }

      // Check if failed
      if (result.data.status === 'failed') {
        logger.error('🔴 [POLL-MUREKA-INSTRUMENTAL] Task failed', { taskId, trackId });

        await supabaseAdmin
          .from('tracks')
          .update({
            status: 'failed',
            error_message: 'Mureka instrumental generation failed',
            metadata: {
              operation: 'add_instrumental',
              mureka_task_id: taskId,
              failed_at: new Date().toISOString(),
            }
          })
          .eq('id', trackId);

        return; // Stop polling
      }

      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    } catch (error) {
      logger.error('🔴 [POLL-MUREKA-INSTRUMENTAL] Polling error', { 
        error: error instanceof Error ? error.message : 'Unknown',
        attempt
      });

      // On last attempt, mark as failed
      if (attempt === MAX_ATTEMPTS) {
        await supabaseAdmin
          .from('tracks')
          .update({
            status: 'failed',
            error_message: 'Polling timeout',
          })
          .eq('id', trackId);
      }
    }
  }

  logger.error('🔴 [POLL-MUREKA-INSTRUMENTAL] Max attempts reached', { taskId, trackId });
}
