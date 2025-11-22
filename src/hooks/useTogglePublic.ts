/**
 * Hook for toggling track visibility (public/private)
 * Updates track's is_public field
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useTogglePublic = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ trackId, isPublic }: { trackId: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from('tracks')
        .update({ is_public: !isPublic })
        .eq('id', trackId);

      if (error) throw error;
      return !isPublic;
    },
    onSuccess: (newIsPublic, { trackId }) => {
      toast.success(newIsPublic ? 'Трек теперь публичный' : 'Трек теперь приватный');
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
    },
    onError: (error: Error) => {
      logger.error('Toggle public error', error, 'useTogglePublic');
      toast.error('Ошибка при изменении видимости');
    }
  });

  const togglePublic = useCallback((trackId: string, isPublic: boolean) => {
    mutation.mutate({ trackId, isPublic });
  }, [mutation]);

  return {
    togglePublic,
    isLoading: mutation.isPending
  };
};
