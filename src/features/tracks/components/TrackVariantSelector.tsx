import React, { useCallback, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTrackVersions } from '@/features/tracks/hooks';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { getVersionShortLabel } from '@/utils/versionLabels';
import { cn } from '@/lib/utils';

interface TrackVariantSelectorProps {
  trackId: string;
  className?: string;
}

export const TrackVariantSelector: React.FC<TrackVariantSelectorProps> = ({ 
  trackId,
  className 
}) => {
  const { versions, mainVersion, versionCount, isLoading } = useTrackVersions(trackId, true);
  const { playTrack, currentTrack } = useAudioPlayer();

  // Определяем текущую играющую версию
  const currentVersionIndex = useMemo(() => {
    if (!currentTrack || currentTrack.parentTrackId !== trackId) {
      return mainVersion?.versionNumber ?? 0;
    }
    return currentTrack.versionNumber ?? 0;
  }, [currentTrack, trackId, mainVersion]);

  // Все версии включая основную
  const allVersions = useMemo(() => {
    if (!mainVersion) return [];
    return [mainVersion, ...versions];
  }, [mainVersion, versions]);

  const handleVersionSelect = useCallback((versionIndex: number) => {
    const selectedVersion = allVersions.find(v => v.versionNumber === versionIndex);
    if (!selectedVersion || !selectedVersion.audio_url) return;

    // Преобразуем TrackWithVersions в AudioPlayerTrack
    const audioTrack = {
      id: selectedVersion.id,
      title: selectedVersion.title,
      audio_url: selectedVersion.audio_url,
      cover_url: selectedVersion.cover_url,
      duration: selectedVersion.duration,
      status: "completed" as const,
      style_tags: selectedVersion.style_tags ?? [],
      lyrics: selectedVersion.lyrics,
      parentTrackId: trackId,
      versionNumber: selectedVersion.versionNumber,
      isMasterVersion: selectedVersion.isMasterVersion,
      isOriginalVersion: selectedVersion.isOriginal,
      sourceVersionNumber: selectedVersion.sourceVersionNumber,
    };
    playTrack(audioTrack);
  }, [allVersions, trackId, playTrack]);

  // Не показываем селектор если нет дополнительных версий
  if (isLoading || versionCount === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 gap-1 text-xs font-medium bg-background/90 backdrop-blur-sm hover:bg-background",
            className
          )}
        >
          <span>{currentVersionIndex + 1}/{versionCount + 1}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 z-[200] bg-background/95 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {allVersions.map((version) => {
          const isActive = version.versionNumber === currentVersionIndex;
          const isMaster = version.isMasterVersion;
          
          return (
            <DropdownMenuItem
              key={version.id}
              onClick={(e) => {
                e.stopPropagation();
                handleVersionSelect(version.versionNumber);
              }}
              disabled={!version.audio_url}
              className={cn(
                "cursor-pointer",
                isActive && "bg-primary/10 font-medium"
              )}
            >
              <span className="flex-1">
                {getVersionShortLabel({
                  versionNumber: version.versionNumber,
                  isOriginal: version.isOriginal,
                  isMaster: isMaster,
                })}
              </span>
              {isActive && (
                <span className="text-xs text-primary">▶</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
