import { serve, createClient } from "../types.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { validateRequest, validationSchemas } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || 'https://localhost:3000',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  ...createSecurityHeaders()
};

const handler = async (req: Request): Promise<Response> => {
  try {
    // Валидация входных данных
    const validatedData = await validateRequest(req, validationSchemas.generateMusic)
    
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

    const { trackId, prompt, tags, title, make_instrumental, model_version, wait_audio } = validatedData
    
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY')
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured')
    }
    
    let finalTrackId = trackId;
    
    // If no trackId provided, create a new track
    if (!trackId) {
      console.log('No trackId provided, creating new track');
      const { data: newTrack, error: createError } = await supabase
        .from('tracks')
        .insert({
          user_id: user.id,
          title: title || 'Untitled Track',
          status: 'processing',
          metadata: {
            prompt,
            tags,
            make_instrumental,
            model_version,
            wait_audio
          }
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating track:', createError);
        throw createError;
      }
      
      finalTrackId = newTrack.id;
      console.log('Created new track:', finalTrackId);
    }
    
    if (!finalTrackId) {
      throw new Error('No trackId provided and failed to create track');
    }

    console.log('Starting Suno generation for track:', finalTrackId);

    // If there's an existing Suno task for this track still processing, resume polling instead of creating a new one
    const { data: existingTrack, error: loadErr } = await supabase
      .from('tracks')
      .select('metadata,status')
      .eq('id', finalTrackId)
      .maybeSingle();
    if (loadErr) {
      console.error('Error loading track for resume:', loadErr);
    }
    const existingTaskId = existingTrack?.metadata?.suno_task_id;
    if (existingTaskId && existingTrack?.status === 'processing') {
      console.log('Resuming existing Suno task:', existingTaskId);
      pollSunoCompletion(finalTrackId, existingTaskId, supabase, SUNO_API_KEY).catch(err => {
        console.error('Resume polling error:', err);
      });
      return new Response(
        JSON.stringify({
          success: true,
          trackId: finalTrackId,
          taskId: existingTaskId,
          message: 'Resumed polling for existing task',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create the generation request
    const sunoPayload = {
      prompt,
      tags,
      title: title || 'Generated Track',
      make_instrumental: make_instrumental || false,
      model_version: model_version || 'chirp-v3-5',
      wait_audio: wait_audio || false
    }

    console.log('Sending request to Suno API:', sunoPayload)

    const response = await fetch('https://api.suno.ai/generate/v2/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sunoPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Suno API error:', response.status, errorText)
      throw new Error(`Suno API error: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('Suno API response:', result)

    // Update track with task ID and start polling
    const taskId = result.id
    const { error: updateError } = await supabase
      .from('tracks')
      .update({
        status: 'processing',
        metadata: {
          ...existingTrack?.metadata,
          suno_task_id: taskId,
          suno_response: result
        }
      })
      .eq('id', finalTrackId)

    if (updateError) {
      console.error('Error updating track:', updateError)
      throw updateError
    }

    // Start polling for completion (don't await - let it run in background)
    pollSunoCompletion(finalTrackId, taskId, supabase, SUNO_API_KEY).catch(err => {
      console.error('Polling error:', err)
    })

    return new Response(
      JSON.stringify({
        success: true,
        trackId: finalTrackId,
        taskId: taskId,
        message: 'Generation started, polling for completion',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in generate-suno function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}

// Wrap handler with rate limiting
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return withRateLimit(handler, {
    maxRequests: 10,
    windowMinutes: 1,
    endpoint: 'generate-suno'
  })(req)
})

async function pollSunoCompletion(
  trackId: string, 
  taskId: string, 
  supabase: any,
  apiKey: string
) {
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    attempts++;

    try {
      console.log(`Polling Suno task ${taskId}, attempt ${attempts}`);

      const response = await fetch(`https://api.sunoapi.org/api/v1/query?taskId=${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error('Polling error:', response.status);
        continue;
      }

      const data = await response.json();
      
      // Log full response for debugging (only first 3 attempts to avoid spam)
      if (attempts <= 3) {
        console.log('Suno poll full response:', JSON.stringify(data, null, 2));
      }
      
      if (data.code !== 200 || !data.data) {
        console.error('Invalid response:', data);
        continue;
      }

      const tasks = data.data;
      const statusesLog = tasks.map((t: any) => ({ 
        id: t.id || t.taskId, 
        status: t.status, 
        hasAudio: Boolean(t.audioUrl || t.audio_url || t.stream_audio_url || t.source_stream_audio_url),
        hasCover: Boolean(t.image_url || t.image_large_url || t.imageUrl),
        hasVideo: Boolean(t.video_url || t.videoUrl)
      }));
      console.log('Suno poll statuses:', statusesLog);
      
      // Check if all tasks are complete
      const allComplete = tasks.every((t: any) => t.status === 'success' || t.status === 'complete');
      const anyFailed = tasks.some((t: any) => t.status === 'error' || t.status === 'failed');

      if (anyFailed) {
        const firstErr = tasks.find((t: any) => t.status === 'error' || t.status === 'failed');
        const reason = firstErr?.msg || firstErr?.error || 'Generation failed';
        await supabase
          .from('tracks')
          .update({ 
            status: 'failed',
            error_message: reason
          })
          .eq('id', trackId);

        console.log('Track generation failed:', trackId, reason);
        return;
      }

      if (allComplete && tasks.length > 0) {
        // Use first successful track with audio
        const successTrack = tasks.find((t: any) => 
          t.audioUrl || t.audio_url || t.stream_audio_url || t.source_stream_audio_url
        );
        
        if (successTrack) {
          const audioUrl = successTrack.audioUrl || successTrack.audio_url || 
                          successTrack.stream_audio_url || successTrack.source_stream_audio_url;
          const duration = successTrack.duration || successTrack.duration_seconds || 0;
          const actualLyrics = successTrack.lyric || successTrack.lyrics || successTrack.prompt;
          const coverUrl = successTrack.image_url || successTrack.image_large_url || successTrack.imageUrl;
          const videoUrl = successTrack.video_url || successTrack.videoUrl;
          const sunoId = successTrack.id;
          const modelName = successTrack.model || successTrack.model_name;
          const createdAtSuno = successTrack.created_at || successTrack.createdAt;

          console.log('Track metadata extracted:', {
            audioUrl: audioUrl?.substring(0, 50),
            coverUrl: coverUrl?.substring(0, 50),
            videoUrl: videoUrl?.substring(0, 50),
            sunoId,
            modelName,
            duration
          });

          await supabase
            .from('tracks')
            .update({ 
              status: 'completed',
              audio_url: audioUrl,
              duration: Math.round(duration),
              duration_seconds: Math.round(duration),
              lyrics: actualLyrics,
              cover_url: coverUrl,
              video_url: videoUrl,
              suno_id: sunoId,
              model_name: modelName,
              created_at_suno: createdAtSuno,
              metadata: { suno_data: tasks }
            })
            .eq('id', trackId);

          console.log('Track completed successfully:', trackId);
          return;
        } else {
          await supabase
            .from('tracks')
            .update({
              status: 'failed',
              error_message: 'Completed without audio URL in response'
            })
            .eq('id', trackId);
          console.error('Suno completed but no audio URL. Track:', trackId);
          return;
        }
      }

    } catch (error) {
      console.error('Polling iteration error:', error);
    }
  }

  // Timeout
  await supabase
    .from('tracks')
    .update({ 
      status: 'failed',
      error_message: 'Generation timeout'
    })
    .eq('id', trackId);

  console.log('Track generation timeout:', trackId);
}
