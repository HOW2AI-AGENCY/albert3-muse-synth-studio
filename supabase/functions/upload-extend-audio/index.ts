import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadExtendAudioRequest {
  uploadUrl: string;
  defaultParamFlag: boolean;
  instrumental?: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: UploadExtendAudioRequest = await req.json();
    
    if (!body.uploadUrl || typeof body.defaultParamFlag !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Missing required fields: uploadUrl, defaultParamFlag' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    // Prepare Suno API payload
    const sunoPayload: any = {
      uploadUrl: body.uploadUrl,
      defaultParamFlag: body.defaultParamFlag,
      model: body.model || 'V4_5PLUS',
      callBackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/suno-callback`
    };

    if (body.defaultParamFlag) {
      if (!body.style || !body.title || typeof body.continueAt !== 'number') {
        return new Response(JSON.stringify({ 
          error: 'When defaultParamFlag is true, style, title, and continueAt are required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      sunoPayload.style = body.style;
      sunoPayload.title = body.title;
      sunoPayload.continueAt = body.continueAt;
      sunoPayload.instrumental = body.instrumental ?? true;
      
      if (!body.instrumental && body.prompt) {
        sunoPayload.prompt = body.prompt;
      }
    }

    if (body.negativeTags) sunoPayload.negativeTags = body.negativeTags;
    if (body.vocalGender) sunoPayload.vocalGender = body.vocalGender;
    if (typeof body.styleWeight === 'number') sunoPayload.styleWeight = body.styleWeight;
    if (typeof body.weirdnessConstraint === 'number') sunoPayload.weirdnessConstraint = body.weirdnessConstraint;
    if (typeof body.audioWeight === 'number') sunoPayload.audioWeight = body.audioWeight;

    console.log('Calling Suno API upload-extend with:', sunoPayload);

    const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate/upload-extend', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sunoPayload)
    });

    const sunoData = await sunoResponse.json();

    if (!sunoResponse.ok || sunoData.code !== 200) {
      console.error('Suno API error:', sunoData);
      return new Response(JSON.stringify({ 
        error: sunoData.msg || 'Failed to call Suno API',
        details: sunoData
      }), {
        status: sunoResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const taskId = sunoData.data?.taskId;
    if (!taskId) {
      throw new Error('No taskId returned from Suno API');
    }

    // Create track record
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .insert({
        user_id: user.id,
        title: body.title || 'Extended Audio',
        prompt: body.prompt || 'Audio extension',
        status: 'processing',
        provider: 'suno',
        model_name: body.model || 'V4_5PLUS',
        has_vocals: !body.instrumental,
        metadata: {
          operation: 'upload_extend',
          suno_task_id: taskId,
          upload_url: body.uploadUrl,
          continue_at: body.continueAt,
          default_param_flag: body.defaultParamFlag
        }
      })
      .select()
      .single();

    if (trackError) {
      console.error('Failed to create track:', trackError);
      throw trackError;
    }

    console.log('Upload-extend task created:', { trackId: track.id, sunoTaskId: taskId });

    return new Response(JSON.stringify({
      success: true,
      trackId: track.id,
      sunoTaskId: taskId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in upload-extend-audio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
