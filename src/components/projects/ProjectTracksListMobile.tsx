/**
 * Project Tracks List Mobile Component
 * Displays all tracks belonging to a project in mobile-optimized layout
 * Phase 2 improvement from 2025-11-05 audit (P1-M7)
 * Phase 3: Added i18n localization support
 */

import { memo, useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, Search, Filter, SortAsc, SortDesc, Plus } from 'lucide-react';
import { TrackCardMobile } from '@/features/tracks/components/TrackCardMobile';
import { TrackStatusBadge } from '@/components/tracks/TrackStatusBadge';
import { useTracks } from '@/hooks/useTracks';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import type { TrackStatus } from '@/components/tracks/track-status.types';

interface ProjectTracksListMobileProps {
  projectId: string;
  projectName?: string;
  onTrackClick?: (trackId: string) => void;
  onAddTrack?: () => void;
  className?: string;
}

type SortOption = 'created_at_desc' | 'created_at_asc' | 'title_asc' | 'title_desc';

export const ProjectTracksListMobile = memo<ProjectTracksListMobileProps>(({
  projectId,
  projectName,
  onTrackClick,
  onAddTrack,
  className,
}) => {
  const t = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrackStatus | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('created_at_desc');

  // Fetch tracks for this project
  const { tracks, isLoading } = useTracks();

  // Filter tracks by project
  const projectTracks = useMemo(() => {
    return tracks.filter(track => track.project_id === projectId);
  }, [tracks, projectId]);

  // Apply filters and sorting
  const filteredAndSortedTracks = useMemo(() => {
    let result = [...projectTracks];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(track =>
        track.title.toLowerCase().includes(query) ||
        track.prompt?.toLowerCase().includes(query) ||
        track.style_tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(track => track.status === statusFilter);
    }

    // Sort
    switch (sortOption) {
      case 'created_at_desc':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'created_at_asc':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title_asc':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title_desc':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return result;
  }, [projectTracks, searchQuery, statusFilter, sortOption]);

  // Statistics
  const stats = useMemo(() => {
    const total = projectTracks.length;
    const completed = projectTracks.filter(t => t.status === 'completed').length;
    const processing = projectTracks.filter(t => t.status === 'processing').length;
    const draft = projectTracks.filter(t => t.status === 'draft').length;
    const pending = projectTracks.filter(t => t.status === 'pending').length;
    const failed = projectTracks.filter(t => t.status === 'failed').length;

    return { total, completed, processing, draft, pending, failed };
  }, [projectTracks]);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-3 border-b bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Music className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold truncate mobile-text-readable">
              {projectName || t('project.viewTracks')}
            </h2>
          </div>
          {onAddTrack && (
            <Button
              size="icon"
              variant="default"
              onClick={onAddTrack}
              className="touch-min"
              aria-label={t('project.addTrack')}
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Statistics */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Badge variant="secondary" className="text-xs">
            {t('statistics.total')}: {stats.total}
          </Badge>
          {stats.completed > 0 && (
            <TrackStatusBadge status="completed" variant="compact" showIcon={false} />
          )}
          {stats.processing > 0 && (
            <TrackStatusBadge status="processing" variant="compact" showIcon={false} />
          )}
          {stats.draft > 0 && (
            <TrackStatusBadge status="draft" variant="compact" showIcon={false} />
          )}
          {stats.pending > 0 && (
            <TrackStatusBadge status="pending" variant="compact" showIcon={false} />
          )}
          {stats.failed > 0 && (
            <TrackStatusBadge status="failed" variant="compact" showIcon={false} />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2 space-y-2 bg-card/30 border-b">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('tracks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 mobile-text-base"
          />
        </div>

        {/* Status Filter & Sort */}
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="flex-1 h-10 mobile-text-base">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('tracks.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.all')}</SelectItem>
              <SelectItem value="completed">{t('statistics.completed')}</SelectItem>
              <SelectItem value="processing">{t('statistics.processing')}</SelectItem>
              <SelectItem value="draft">{t('statistics.draft')}</SelectItem>
              <SelectItem value="pending">{t('statistics.pending')}</SelectItem>
              <SelectItem value="failed">{t('statistics.failed')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
            <SelectTrigger className="flex-1 h-10 mobile-text-base">
              {sortOption.includes('desc') ? (
                <SortDesc className="h-4 w-4 mr-2" />
              ) : (
                <SortAsc className="h-4 w-4 mr-2" />
              )}
              <SelectValue placeholder={t('common.sort')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">{t('sort.createdDesc')}</SelectItem>
              <SelectItem value="created_at_asc">{t('sort.createdAsc')}</SelectItem>
              <SelectItem value="title_asc">{t('sort.titleAsc')}</SelectItem>
              <SelectItem value="title_desc">{t('sort.titleDesc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tracks List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            </div>
          </div>
        ) : filteredAndSortedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Music className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              {searchQuery || statusFilter !== 'all' ? t('tracks.noTracks') : t('tracks.noTracks')}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              {searchQuery || statusFilter !== 'all'
                ? t('tracks.noTracksDescription')
                : t('tracks.noTracksDescription')}
            </p>
            {onAddTrack && !(searchQuery || statusFilter !== 'all') && (
              <Button onClick={onAddTrack} className="touch-min">
                <Plus className="h-4 w-4 mr-2" />
                {t('project.addTrack')}
              </Button>
            )}
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
            {filteredAndSortedTracks.map((track) => (
              <TrackCardMobile
                key={track.id}
                track={track as any}
                onClick={() => onTrackClick?.(track.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer with count */}
      {filteredAndSortedTracks.length > 0 && (
        <div className="flex-shrink-0 px-3 sm:px-4 py-2 border-t bg-card/30 text-center">
          <p className="text-xs text-muted-foreground">
            Показано {filteredAndSortedTracks.length} из {stats.total} треков
          </p>
        </div>
      )}
    </div>
  );
});

ProjectTracksListMobile.displayName = 'ProjectTracksListMobile';
