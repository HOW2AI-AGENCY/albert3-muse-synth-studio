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

    // Update track status to processing
    await supabase
      .from('tracks')
      .update({ status: 'processing', provider: 'suno' })
      .eq('id', trackId);

    // Prepare Suno API request
    const sunoPayload: any = {
      prompt: prompt,
      make_instrumental: !hasVocals,
      wait_audio: false, // Async generation
    };

    if (customMode && lyrics) {
      sunoPayload.custom_mode = true;
      sunoPayload.lyrics = lyrics;
      if (styleTags.length > 0) {
        sunoPayload.tags = styleTags.join(', ');
      }
    }

    console.log('Suno API request:', sunoPayload);

    // Call Suno API (using sunoapi.org endpoint)
    const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/gateway/generate/music', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sunoPayload),
    });

    if (!sunoResponse.ok) {
      const errorText = await sunoResponse.text();
      console.error('Suno API error:', sunoResponse.status, errorText);
      
      await supabase
        .from('tracks')
        .update({ 
          status: 'failed', 
          error_message: `Suno API error: ${sunoResponse.status}` 
        })
        .eq('id', trackId);
      
      throw new Error(`Suno API failed: ${sunoResponse.status}`);
    }

    const sunoData = await sunoResponse.json();
    console.log('Suno response:', sunoData);

    // Extract task IDs for polling
    const taskIds = sunoData.data?.map((item: any) => item.song_id || item.id) || [];

    if (taskIds.length === 0) {
      throw new Error('No task IDs returned from Suno');
    }

    // Store task IDs in metadata for polling
    await supabase
      .from('tracks')
      .update({ 
        metadata: { 
          suno_task_ids: taskIds,
          suno_response: sunoData 
        }
      })
      .eq('id', trackId);

    // Start background polling
    EdgeRuntime.waitUntil(pollSunoCompletion(trackId, taskIds[0], supabase, SUNO_API_KEY));

    console.log('Suno generation started, polling initiated');

    return new Response(
      JSON.stringify({ 
        success: true,
        trackId,
        taskIds,
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

      const response = await fetch(`https://api.sunoapi.org/api/v1/gateway/query?ids=${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error('Polling error:', response.status);
        continue;
      }

      const data = await response.json();
      const task = data.data?.[0];

      if (!task) {
        console.error('No task data in response');
        continue;
      }

      console.log('Task status:', task.status);

      if (task.status === 'complete' || task.status === 'success') {
        const audioUrl = task.audio_url || task.song_path;
        const duration = task.duration || 0;
        const actualLyrics = task.lyric || task.lyrics;

        if (audioUrl) {
          await supabase
            .from('tracks')
            .update({ 
              status: 'completed',
              audio_url: audioUrl,
              duration: Math.round(duration),
              lyrics: actualLyrics,
              metadata: { suno_data: task }
            })
            .eq('id', trackId);

          console.log('Track completed successfully:', trackId);
          return;
        }
      } else if (task.status === 'error' || task.status === 'failed') {
        await supabase
          .from('tracks')
          .update({ 
            status: 'failed',
            error_message: task.error_message || 'Generation failed'
          })
          .eq('id', trackId);

        console.log('Track generation failed:', trackId);
        return;
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
