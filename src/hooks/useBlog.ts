/**
 * Blog Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BlogPostFilters {
  category?: string;
  search?: string;
  sortBy?: 'recent' | 'popular';
  limit?: number;
}

export const useBlogCategories = () => {
  return useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

export const useBlogPosts = (filters: BlogPostFilters = {}) => {
  return useQuery({
    queryKey: ['blog-posts', filters],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          category:blog_categories(id, name, slug, icon, color)
        `)
        .eq('is_published', true)
        .eq('status', 'published');

      // Filter by category
      if (filters.category) {
        const { data: category } = await supabase
          .from('blog_categories')
          .select('id')
          .eq('slug', filters.category)
          .single();
        
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      // Search
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
      }

      // Sort
      if (filters.sortBy === 'popular') {
        query = query.order('view_count', { ascending: false });
      } else {
        query = query.order('published_at', { ascending: false });
      }

      // Limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

export const useBlogPost = (slug: string) => {
  return useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          category:blog_categories(id, name, slug, icon, color),
          author:profiles(id, full_name, avatar_url)
        `)
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;

      // Increment view count
      await supabase.rpc('increment_blog_post_view', { post_id: data.id });

      return data;
    },
  });
};

export const useLikeBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Необходимо авторизоваться');

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('blog_post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('blog_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
        return { action: 'unlike' };
      } else {
        // Like
        const { error } = await supabase
          .from('blog_post_likes')
          .insert({ post_id: postId, user_id: user.id });

        if (error) throw error;
        return { action: 'like' };
      }
    },
    onSuccess: (data) => {
      toast.success(data.action === 'like' ? 'Статья добавлена в избранное' : 'Удалено из избранного');
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
