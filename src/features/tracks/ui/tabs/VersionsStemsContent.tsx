/**
 * Versions & Stems Tab Content
 * Combined view for track versions and stems
 */

import { VersionsCard } from '../cards/VersionsCard';
import { StemsCard } from '../cards/StemsCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Track } from '@/types/domain/track.types';
import { AlertCircle } from 'lucide-react';

interface VersionsStemsContentProps {
  track: Track;
}

export const VersionsStemsContent = ({ track }: VersionsStemsContentProps) => {
  // Fetch versions
  const { data: versionsData = [] } = useQuery({
    queryKey: ['track-versions', track.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('track_versions')
        .select('*')
        .eq('parent_track_id', track.id)
        .order('variant_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const versions = versionsData.map(v => ({
    ...v,
    metadata: v.metadata as Record<string, any> | null
  }));

  const hasVersions = versions.length > 0;
  const hasStems = track.has_stems;

  if (!hasVersions && !hasStems) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-3 px-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Нет дополнительных версий или стемов
          </p>
          <p className="text-xs text-muted-foreground/70">
            Вы можете создать новые версии или разделить трек на стемы
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Versions */}
      {hasVersions && (
        <VersionsCard versions={versions} trackId={track.id} />
      )}

      {/* Stems */}
      {hasStems && (
        <StemsCard trackId={track.id} />
      )}
    </div>
  );
};
