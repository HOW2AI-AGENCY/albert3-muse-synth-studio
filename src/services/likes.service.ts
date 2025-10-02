import { supabase } from "@/integrations/supabase/client";

export class LikesService {
  /**
   * Toggle like status for a track
   * Returns true if track is now liked, false if unliked
   */
  static async toggleLike(trackId: string, userId: string): Promise<boolean> {
    try {
      // Check if already liked
      const { data: existing, error: checkError } = await supabase
        .from('track_likes')
        .select('id')
        .eq('track_id', trackId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Unlike - delete the record
        const { error: deleteError } = await supabase
          .from('track_likes')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;
        return false;
      } else {
        // Like - insert new record
        const { error: insertError } = await supabase
          .from('track_likes')
          .insert({
            track_id: trackId,
            user_id: userId,
          });

        if (insertError) throw insertError;
        return true;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  /**
   * Check if a track is liked by the user
   */
  static async isLiked(trackId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('track_likes')
        .select('id')
        .eq('track_id', trackId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  }

  /**
   * Get all liked tracks for a user
   */
  static async getLikedTracks(userId: string) {
    try {
      const { data, error } = await supabase
        .from('track_likes')
        .select(`
          track_id,
          tracks (
            id,
            title,
            audio_url,
            cover_url,
            duration,
            style_tags,
            status,
            user_id,
            created_at,
            like_count,
            view_count
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Extract tracks from the joined data
      const tracks = data?.map(item => item.tracks).filter(Boolean) || [];
      return tracks;
    } catch (error) {
      console.error('Error fetching liked tracks:', error);
      return [];
    }
  }

  /**
   * Get like count for a track
   */
  static async getLikeCount(trackId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('like_count')
        .eq('id', trackId)
        .maybeSingle();

      if (error) throw error;
      return data?.like_count || 0;
    } catch (error) {
      console.error('Error fetching like count:', error);
      return 0;
    }
  }
}
