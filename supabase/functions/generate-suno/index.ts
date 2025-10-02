import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackId, prompt, lyrics, hasVocals = false, styleTags = [], customMode = false } = await req.json();
    
    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting Suno generation for track:', trackId);

    // If there's an existing Suno task for this track still processing, resume polling instead of creating a new one
    const { data: existingTrack, error: loadErr } = await supabase
      .from('tracks')
      .select('metadata,status')
      .eq('id', trackId)
      .maybeSingle();
    if (loadErr) {
      console.error('Error loading track for resume:', loadErr);
    }
    const existingTaskId = existingTrack?.metadata?.suno_task_id;
    if (existingTaskId && existingTrack?.status === 'processing') {
      console.log('Resuming existing Suno task:', existingTaskId);
      pollSunoCompletion(trackId, existingTaskId, supabase, SUNO_API_KEY).catch(err => {
        console.error('Resume polling error:', err);
      });
      return new Response(
        JSON.stringify({
          success: true,
          trackId,
          taskId: existingTaskId,
          message: 'Resumed polling for existing task',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Update track status to processing
    await supabase
      .from('tracks')
      .update({ status: 'processing', provider: 'suno' })
      .eq('id', trackId);

    // Prepare Suno API request
    const callbackUrl = `${SUPABASE_URL}/functions/v1/suno-callback`;

    const sunoPayload: any = {
      prompt,
      instrumental: !hasVocals,
      model: 'V5', // Latest Suno model for best quality
      customMode: !!customMode,
      callBackUrl: callbackUrl,
    };

    if (customMode) {
      if (lyrics) sunoPayload.lyrics = lyrics;
      if (styleTags?.length > 0) {
        sunoPayload.style = styleTags.join(', ');
      }
    }

    console.log('Suno API request:', sunoPayload);

    console.log('Suno API request:', sunoPayload);

    // Call Suno API with retries and detailed logging
    let sunoResponse: Response | null = null;
    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sunoPayload),
        });
        // Log status and body safely
        try {
          const clone = sunoResponse.clone();
          const debugText = await clone.text();
          console.log(`Suno generate attempt ${attempt} -> ${sunoResponse.status}:`, debugText);
        } catch (e) {
          console.error('Error logging Suno response body:', e);
        }

        if (sunoResponse.ok) break;
        // Retry only on server errors
        if (sunoResponse.status >= 500 && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
        break;
      } catch (e) {
        console.error('Suno generate fetch error attempt', attempt, e);
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
        throw e;
      }
    }

    if (!sunoResponse || !sunoResponse.ok) {
      const errorText = sunoResponse ? await sunoResponse.text() : 'No response';
      console.error('Suno API error:', sunoResponse?.status, errorText);
      await supabase
        .from('tracks')
        .update({ 
          status: 'failed', 
          error_message: `Suno API error: ${sunoResponse?.status ?? 'no_response'} - ${errorText}` 
        })
        .eq('id', trackId);
      throw new Error(`Suno API failed: ${sunoResponse?.status ?? 'no_response'}`);
    }

    const sunoData = await sunoResponse.json();
    console.log('Suno response:', sunoData);

    // Check for API error
    if (sunoData.code !== 200 || !sunoData.data?.taskId) {
      const msg = sunoData.msg || 'Unknown error';
      console.error('Suno API logical error:', msg, sunoData);
      await supabase
        .from('tracks')
        .update({
          status: 'failed',
          error_message: `Suno API error: ${msg}`
        })
        .eq('id', trackId);
      throw new Error(`Suno API error: ${msg}`);
    }

    const taskId = sunoData.data.taskId;

    // Store task ID in metadata for polling
    await supabase
      .from('tracks')
      .update({ 
        metadata: { 
          suno_task_id: taskId,
          suno_response: sunoData 
        }
      })
      .eq('id', trackId);

    // Start background polling (fire and forget)
    pollSunoCompletion(trackId, taskId, supabase, SUNO_API_KEY).catch(err => {
      console.error('Polling error:', err);
    });

    console.log('Suno generation started, polling initiated');

    return new Response(
      JSON.stringify({ 
        success: true,
        trackId,
        taskId,
        message: 'Generation started'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-suno function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

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
      
      if (data.code !== 200 || !data.data) {
        console.error('Invalid response:', data);
        continue;
      }

      const tasks = data.data;
      const statusesLog = tasks.map((t: any) => ({ id: t.id || t.taskId, status: t.status, hasAudio: Boolean(t.audioUrl || t.audio_url) }));
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
        const successTrack = tasks.find((t: any) => t.audioUrl || t.audio_url);
        
        if (successTrack) {
          const audioUrl = successTrack.audioUrl || successTrack.audio_url;
          const duration = successTrack.duration || 0;
          const actualLyrics = successTrack.lyric || successTrack.lyrics;

          await supabase
            .from('tracks')
            .update({ 
              status: 'completed',
              audio_url: audioUrl,
              duration: Math.round(duration),
              lyrics: actualLyrics,
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
