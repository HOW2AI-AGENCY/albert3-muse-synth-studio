/**
 * useTrackVersionLike Hook
 * 
 * Manages like state for individual track versions
 * Unlike useTrackLike, this hook works with track_version_likes table
 */

import { useState, useEffect } from 'react';
import { LikesService } from '@/services/likes.service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useTrackVersionLike = (versionId: string | null, initialLikeCount: number = 0) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  // Check if version is liked on mount
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!versionId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const liked = await LikesService.isVersionLiked(versionId, user.id);
      setIsLiked(liked);
    };

    checkLikeStatus();
  }, [versionId]);

  // Subscribe to version changes to update like count in real-time
  useEffect(() => {
    if (!versionId) return;

    const channel = supabase
      .channel(`version-likes-${versionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'track_versions',
          filter: `id=eq.${versionId}`,
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
  }, [versionId]);

  const toggleLike = async () => {
    if (isLoading || !versionId) return;

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
      const nowLiked = await LikesService.toggleVersionLike(versionId, user.id);

      // Verify the optimistic update was correct
      if (nowLiked !== !wasLiked) {
        // Revert if different
        setIsLiked(nowLiked);
        const actualCount = await LikesService.getVersionLikeCount(versionId);
        setLikeCount(actualCount);
      }

      toast.success(nowLiked ? 'Версия добавлена в избранное' : 'Версия удалена из избранного');
    } catch (error) {
      logger.error('Error toggling version like', error instanceof Error ? error : new Error(String(error)), 'useTrackVersionLike', { versionId });
      
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
