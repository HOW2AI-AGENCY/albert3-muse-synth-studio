import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type: 'track' | 'like' | 'comment' | 'system' | 'generation' | 'error';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Получение уведомлений
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Failed to fetch notifications', error, 'useNotifications');
        throw error;
      }

      return data as Notification[];
    },
    enabled: !!userId,
  });

  // Подписка на realtime обновления
  useEffect(() => {
    if (!userId) return;

    const channel: RealtimeChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          logger.info('Notification realtime update', 'useNotifications', { eventType: payload.eventType });
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const notification = payload.new as Notification;
            toast({
              title: notification.title,
              description: notification.message,
            });
          }

          queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Отметить уведомление как прочитанное
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
    onError: (error) => {
      logger.error('Failed to mark notification as read', error, 'useNotifications');
    },
  });

  // Отметить все уведомления как прочитанные
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      toast({
        title: 'Все уведомления отмечены как прочитанные',
      });
    },
    onError: (error) => {
      logger.error('Failed to mark all notifications as read', error, 'useNotifications');
      toast({
        title: 'Ошибка',
        description: 'Не удалось отметить уведомления как прочитанные',
        variant: 'destructive',
      });
    },
  });

  // Удалить уведомление
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
    onError: (error) => {
      logger.error('Failed to delete notification', error, 'useNotifications');
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
  };
};
