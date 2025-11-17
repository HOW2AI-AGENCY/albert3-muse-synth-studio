import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = createCorsHeaders(req);

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      logger.error("[ADD-VOCALS] Authentication failed", { error: authError });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      uploadUrl,
      prompt,
      title,
      negativeTags,
      style,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight,
      model = 'V4_5PLUS',
      trackId,
      personaId
    } = body;

    // Validate required fields
    if (!uploadUrl || !prompt || !title || !negativeTags || !style) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: uploadUrl, prompt, title, negativeTags, style" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate model
    if (model !== 'V4_5PLUS' && model !== 'V5') {
      return new Response(
        JSON.stringify({ 
          error: "Invalid model. Must be V4_5PLUS or V5" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("[ADD-VOCALS] Starting vocal generation", {
      userId: user.id,
      trackId,
      uploadUrl,
      title,
      model
    });

    // Call Suno API
    const sunoPayload: any = {
      uploadUrl,
      prompt,
      title,
      negativeTags,
      style,
      callBackUrl: `${SUPABASE_URL}/functions/v1/add-vocals-callback`,
      model
    };

    // Add optional parameters
    if (vocalGender) sunoPayload.vocalGender = vocalGender;
    if (styleWeight !== undefined) sunoPayload.styleWeight = styleWeight;
    if (weirdnessConstraint !== undefined) sunoPayload.weirdnessConstraint = weirdnessConstraint;
    if (audioWeight !== undefined) sunoPayload.audioWeight = audioWeight;
    if (personaId) sunoPayload.personaId = personaId;

    const sunoResponse = await fetch("https://api.sunoapi.org/api/v1/generate/add-vocals", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(sunoPayload)
    });

    if (!sunoResponse.ok) {
      const errorText = await sunoResponse.text();
      logger.error("[ADD-VOCALS] Suno API error", { 
        status: sunoResponse.status, 
        error: errorText 
      });
      
      if (sunoResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (sunoResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Suno API error: ${errorText}`);
    }

    const sunoData = await sunoResponse.json();
    const taskId = sunoData.data?.taskId;

    if (!taskId) {
      throw new Error("No taskId returned from Suno API");
    }

    logger.info("[ADD-VOCALS] Task created successfully", { 
      taskId,
      userId: user.id 
    });

    // Create or update track record
    const trackData: any = {
      user_id: user.id,
      title,
      prompt,
      status: 'processing',
      provider: 'suno',
      has_vocals: true,
      suno_id: taskId,
      model_name: model,
      style_tags: style.split(',').map((s: string) => s.trim()),
      metadata: {
        operation_type: 'add_vocals',
        reference_audio_url: uploadUrl,
        vocal_gender: vocalGender,
        style_weight: styleWeight,
        weirdness_constraint: weirdnessConstraint,
        audio_weight: audioWeight,
        negative_tags: negativeTags,
        style,
        stage: 'initiated',
        stage_timestamp: new Date().toISOString()
      }
    };

    if (trackId) {
      // Update existing track
      const { error: updateError } = await supabase
        .from('tracks')
        .update(trackData)
        .eq('id', trackId);

      if (updateError) {
        logger.error("[ADD-VOCALS] Failed to update track", { error: updateError });
      }
    } else {
      // Create new track
      const { data: newTrack, error: insertError } = await supabase
        .from('tracks')
        .insert(trackData)
        .select()
        .single();

      if (insertError) {
        logger.error("[ADD-VOCALS] Failed to create track", { error: insertError });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        taskId,
        trackId: trackId || undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    logger.error("[ADD-VOCALS] Error", { error: error instanceof Error ? error.message : error });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
