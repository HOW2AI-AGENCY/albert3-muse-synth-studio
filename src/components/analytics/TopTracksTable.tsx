/**
 * Top Tracks Table Component
 * Displays most played and liked tracks
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Heart } from 'lucide-react';
import { logger } from '@/utils/logger';

interface TopTracksTableProps {
  timeRange: '7d' | '30d' | '90d';
}

export const TopTracksTable = ({ timeRange }: TopTracksTableProps) => {
  const { data: tracks, isLoading } = useQuery({
    queryKey: ['top-tracks', timeRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, play_count, like_count, created_at, cover_url')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('play_count', { ascending: false })
        .limit(10);

      if (error) {
        logger.error('Failed to fetch top tracks', error, 'TopTracksTable');
        throw error;
      }

      logger.info('Top tracks loaded', 'TopTracksTable', { count: data?.length });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No completed tracks in this period
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Track</TableHead>
          <TableHead className="text-center">
            <Play className="h-4 w-4 inline" />
          </TableHead>
          <TableHead className="text-center">
            <Heart className="h-4 w-4 inline" />
          </TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tracks.map((track, index) => (
          <TableRow key={track.id}>
            <TableCell className="font-medium">{index + 1}</TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                {track.cover_url && (
                  <img 
                    src={track.cover_url} 
                    alt={track.title}
                    className="h-10 w-10 rounded object-cover"
                  />
                )}
                <span className="font-medium">{track.title}</span>
              </div>
            </TableCell>
            <TableCell className="text-center">{track.play_count || 0}</TableCell>
            <TableCell className="text-center">{track.like_count || 0}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(track.created_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
