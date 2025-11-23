// src/features/studio/hooks/useStems.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const stemQueryKeys = {
  all: ['stems'] as const,
  list: (trackId: string) => [...stemQueryKeys.all, 'list', trackId] as const,
};

const fetchStems = async (trackId: string) => {
  const { data, error } = await supabase
    .from('track_stems')
    .select('*')
    .eq('track_id', trackId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const useStems = (trackId: string) => {
  return useQuery({
    queryKey: stemQueryKeys.list(trackId),
    queryFn: () => fetchStems(trackId),
    enabled: !!trackId,
  });
};
