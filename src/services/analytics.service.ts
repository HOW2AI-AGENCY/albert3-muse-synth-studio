import { supabase } from "@/integrations/supabase/client";

export class AnalyticsService {
  /**
   * Record a play event for a track
   * Increments the view_count in the tracks table
   */
  static async recordPlay(trackId: string): Promise<void> {
    try {
      // First get current view_count
      const { data: currentTrack } = await supabase
        .from('tracks')
        .select('view_count')
        .eq('id', trackId)
        .maybeSingle();

      const newCount = (currentTrack?.view_count || 0) + 1;

      // Update with new count
      const { error } = await supabase
        .from('tracks')
        .update({ view_count: newCount })
        .eq('id', trackId);

      if (error) {
        console.error('Error in recordPlay:', error);
      }
    } catch (error) {
      console.error('Error recording play:', error);
      // Don't throw - analytics shouldn't break the app
    }
  }

  /**
   * Get analytics for a specific track
   */
  static async getTrackAnalytics(trackId: string) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('view_count, like_count, created_at')
        .eq('id', trackId)
        .maybeSingle();

      if (error) throw error;

      return {
        plays: data?.view_count || 0,
        likes: data?.like_count || 0,
        createdAt: data?.created_at,
      };
    } catch (error) {
      console.error('Error fetching track analytics:', error);
      return {
        plays: 0,
        likes: 0,
        createdAt: null,
      };
    }
  }

  /**
   * Get user's most played tracks
   */
  static async getMostPlayedTracks(userId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, view_count, like_count, cover_url, style_tags')
        .eq('user_id', userId)
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching most played tracks:', error);
      return [];
    }
  }

  /**
   * Get user's total stats
   */
  static async getUserStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('view_count, like_count')
        .eq('user_id', userId);

      if (error) throw error;

      const totalPlays = data?.reduce((sum, track) => sum + (track.view_count || 0), 0) || 0;
      const totalLikes = data?.reduce((sum, track) => sum + (track.like_count || 0), 0) || 0;

      return {
        totalTracks: data?.length || 0,
        totalPlays,
        totalLikes,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalTracks: 0,
        totalPlays: 0,
        totalLikes: 0,
      };
    }
  }
}
