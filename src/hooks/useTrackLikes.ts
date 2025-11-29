/**
 * Hook for track likes management
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTrackLikes = (trackId: string) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const likeTrack = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('track_likes').insert({
        user_id: user.id,
        track_id: trackId,
      });

      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      toast.success('Добавлено в избранное');
    } catch (error) {
      toast.error('Ошибка добавления в избранное');
    }
  }, [trackId]);

  const unlikeTrack = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('track_likes').delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId);

      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
      toast.success('Удалено из избранного');
    } catch (error) {
      toast.error('Ошибка удаления из избранного');
    }
  }, [trackId]);

  return { isLiked, likeCount, likeTrack, unlikeTrack };
};
