import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { code, data } = body;

    logger.info('Cover image callback', { code, taskId: data?.task_id });

    const supabase = createSupabaseAdminClient();
    const { data: tracks } = await supabase.from('tracks')
      .select('*').contains('metadata', { cover_generation_task_id: data.task_id });

    if (!tracks?.length) {
      return new Response(JSON.stringify({ status: 'received' }), { status: 200, headers: corsHeaders });
    }

    const track = tracks[0];

    if (code === 200 && data.images?.length > 0) {
      await supabase.from('tracks').update({
        cover_url: data.images[0],
        metadata: { ...track.metadata, cover_generation_status: 'completed', generated_cover_images: data.images }
      }).eq('id', track.id);
      logger.info('Cover images saved', { trackId: track.id });
    } else {
      await supabase.from('tracks').update({
        metadata: { ...track.metadata, cover_generation_status: 'failed' }
      }).eq('id', track.id);
    }

    return new Response(JSON.stringify({ status: 'received' }), { status: 200, headers: corsHeaders });
  } catch (error) {
    logger.error('Cover callback error', error as Error);
    return new Response(JSON.stringify({ status: 'error' }), { status: 200, headers: corsHeaders });
  }
});
