/**
 * TrackInspector Component
 *
 * Detailed track information panel (right side of workspace)
 * Includes tabs for Overview, Versions, Stems, and Details
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Heart,
  Share2,
  Download,
  Trash2,
  Edit,
  Send,
  Wand2,
  Music,
  FileText,
  Info,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TrackInspectorProps, TrackStatus } from '@/types/suno-ui.types';

// Format duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Status badge config
const getStatusBadge = (status: TrackStatus) => {
  const config: Record<TrackStatus, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
    queued: { label: 'Queued', className: 'bg-blue-500/10 text-blue-600' },
    processing: { label: 'Processing', className: 'bg-yellow-500/10 text-yellow-600 animate-pulse' },
    ready: { label: 'Ready', className: 'bg-green-500/10 text-green-600' },
    failed: { label: 'Failed', className: 'bg-red-500/10 text-red-600' },
    published: { label: 'Published', className: 'bg-primary/10 text-primary' },
    deleted: { label: 'Deleted', className: 'bg-muted text-muted-foreground' },
  };
  return config[status] || config.draft;
};

export const TrackInspector = memo<TrackInspectorProps>(({
  trackId,
  track,
  isLoading = false,
  activeTab = 'overview',
  onTabChange,
  onRemix,
  onEdit,
  onPublish,
  onShare,
  onDownload,
  onDelete,
  canEdit = true,
  canPublish = true,
  canDelete = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(track?.flags?.liked || false);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleLikeToggle = useCallback(() => {
    setIsLiked((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Music className="w-12 h-12 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No track selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a track to view details
        </p>
      </div>
    );
  }

  const statusBadge = getStatusBadge(track.status);
  const canPlay = track.status === 'ready' || track.status === 'published';

  return (
    <div className="space-y-6">
      {/* Cover & Media Preview */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        {track.thumbnailUrl ? (
          <img
            src={track.thumbnailUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-24 h-24 text-muted-foreground/30" />
          </div>
        )}

        {/* Play Overlay */}
        {canPlay && (
          <button
            onClick={handlePlayPause}
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-black/40 backdrop-blur-sm opacity-0 hover:opacity-100',
              'transition-opacity duration-200',
              isPlaying && 'opacity-100'
            )}
          >
            {isPlaying ? (
              <Pause className="w-16 h-16 text-white" fill="currentColor" />
            ) : (
              <Play className="w-16 h-16 text-white" fill="currentColor" />
            )}
          </button>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
      </div>

      {/* Title & Meta */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{track.title}</h2>
        {track.summary && (
          <p className="text-sm text-muted-foreground">{track.summary}</p>
        )}
        {track.meta && (
          <p className="text-xs text-muted-foreground">{track.meta}</p>
        )}
      </div>

      {/* Badges */}
      {track.badges && track.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {track.badges.map((badge, idx) => (
            <Badge key={`${badge}-${idx}`} variant="secondary">
              {badge}
            </Badge>
          ))}
        </div>
      )}

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-2">
        {onRemix && canEdit && (
          <Button
            variant="default"
            onClick={onRemix}
            className="gap-2"
            disabled={track.status !== 'ready' && track.status !== 'published'}
          >
            <Wand2 className="w-4 h-4" />
            Remix
          </Button>
        )}
        {onEdit && canEdit && (
          <Button
            variant="outline"
            onClick={onEdit}
            className="gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        )}
        {onPublish && canPublish && !track.flags?.published && (
          <Button
            variant="default"
            onClick={onPublish}
            className="gap-2 col-span-2"
            disabled={track.status !== 'ready'}
          >
            <Send className="w-4 h-4" />
            Publish Track
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleLikeToggle}
        >
          <Heart
            className={cn(
              'w-4 h-4',
              isLiked && 'fill-red-500 text-red-500'
            )}
          />
        </Button>
        {onShare && (
          <Button variant="outline" size="icon" onClick={onShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        )}
        {onDownload && (
          <Button variant="outline" size="icon" onClick={onDownload}>
            <Download className="w-4 h-4" />
          </Button>
        )}
        {onDelete && canDelete && (
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={onTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">
            <Info className="w-3 h-3 mr-1" />
            Info
          </TabsTrigger>
          <TabsTrigger value="lyrics" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Lyrics
          </TabsTrigger>
          <TabsTrigger value="versions" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs">
            <Info className="w-3 h-3 mr-1" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">
                {track.durationSec ? formatDuration(track.durationSec) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plays</span>
              <span className="font-medium">{track.stats?.plays || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Likes</span>
              <span className="font-medium">{track.stats?.likes || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Comments</span>
              <span className="font-medium">{track.stats?.comments || 0}</span>
            </div>
          </div>
        </TabsContent>

        {/* Lyrics Tab */}
        <TabsContent value="lyrics" className="mt-4">
          <ScrollArea className="h-[300px]">
            {track.lyrics ? (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {track.lyrics}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No lyrics available
              </p>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="mt-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            Version management coming soon
          </p>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-3 mt-4">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Track ID</span>
              <p className="font-mono text-xs mt-1">{track.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="mt-1">{track.status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Visibility</span>
              <p className="mt-1">{track.visibility || 'private'}</p>
            </div>
            {track.errorMessage && (
              <div>
                <span className="text-destructive">Error</span>
                <p className="text-xs text-destructive mt-1">{track.errorMessage}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

TrackInspector.displayName = 'TrackInspector';
