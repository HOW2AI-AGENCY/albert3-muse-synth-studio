/**
 * useCloudFolders Hook - Управление папками облака
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger';

export interface CloudFolder {
  id: string;
  user_id: string;
  name: string;
  category?: string;
  parent_id?: string;
  color?: string;
  description?: string;
  sort_order?: number;
  created_at: string;
  updated_at?: string;
}

export const useCloudFolders = (category?: string) => {
  const { data: folders, isLoading, error } = useQuery({
    queryKey: ['cloud-folders', category],
    queryFn: async () => {
      let query = supabase
        .from('cloud_folders')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CloudFolder[];
    },
  });

  if (error) {
    logger.error('Failed to fetch cloud folders', error as Error, 'useCloudFolders', { category });
  }

  return { folders, isLoading, error };
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (folderData: { name: string; category?: string; parent_id?: string; color?: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('cloud_folders')
        .insert({
          user_id: user.id,
          name: folderData.name,
          category: folderData.category,
          parent_id: folderData.parent_id,
          color: folderData.color,
          description: folderData.description,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CloudFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-folders'] });
      toast({
        title: 'Папка создана',
        description: 'Новая папка успешно создана',
      });
    },
    onError: (error) => {
      logger.error('Failed to create folder', error as Error, 'useCreateFolder');
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать папку',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('cloud_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-folders'] });
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
      toast({
        title: 'Папка удалена',
        description: 'Папка успешно удалена',
      });
    },
    onError: (error) => {
      logger.error('Failed to delete folder', error as Error, 'useDeleteFolder');
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить папку',
        variant: 'destructive',
      });
    },
  });
};
