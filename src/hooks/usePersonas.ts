import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface Persona {
  id: string;
  suno_persona_id: string;
  name: string;
  description: string;
  source_track_id: string | null;
  cover_image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const usePersonas = () => {
  return useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      logger.info('🎭 [PERSONAS] Fetching user personas');

      const { data, error } = await supabase
        .from('suno_personas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(`❌ [PERSONAS] Failed to fetch: ${error.message}`);
        throw error;
      }

      logger.info(`✅ [PERSONAS] Fetched ${data?.length || 0} personas`);
      return data as Persona[];
    },
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};
