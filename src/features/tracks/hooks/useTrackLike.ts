import { useState, useEffect } from 'react';
import { LikesService } from '@/services/likes.service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useTrackLike = (trackId: string, initialLikeCount: number = 0) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  // Check if track is liked on mount
  useEffect(() => {
    const checkLikeStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const liked = await LikesService.isLiked(trackId, user.id);
      setIsLiked(liked);
    };

    checkLikeStatus();
  }, [trackId]);

  // Subscribe to track changes to update like count in real-time
  useEffect(() => {
    const channel = supabase
      .channel(`track-likes-${trackId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tracks',
          filter: `id=eq.${trackId}`,
        },
        (payload) => {
          if (payload.new && 'like_count' in payload.new) {
            setLikeCount(payload.new.like_count as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackId]);

  const toggleLike = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Войдите в систему', {
          description: 'Необходимо войти, чтобы ставить лайки',
        });
        return;
      }

      // Optimistic update
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);

      // Perform the actual toggle
      const nowLiked = await LikesService.toggleLike(trackId, user.id);

      // Verify the optimistic update was correct
      if (nowLiked !== !wasLiked) {
        // Revert if different
        setIsLiked(nowLiked);
        const actualCount = await LikesService.getLikeCount(trackId);
        setLikeCount(actualCount);
      }

      toast.success(nowLiked ? 'Трек добавлен в избранное' : 'Трек удален из избранного');
    } catch (error) {
      logger.error('Error toggling like', error instanceof Error ? error : new Error(String(error)), 'useTrackLike', { trackId });
      
      // Revert optimistic update on error
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
      
      toast.error('Ошибка', {
        description: 'Не удалось обновить статус лайка',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLiked,
    likeCount,
    toggleLike,
    isLoading,
  };
};
