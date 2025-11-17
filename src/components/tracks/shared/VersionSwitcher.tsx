import { useState, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTrackVariants } from '@/features/tracks/hooks';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { logInfo } from '@/utils/logger';

interface VersionSwitcherProps {
  trackId: string;
  currentVersionId?: string;
  onVersionChange?: (versionId: string, versionNumber: number) => void;
}

export const VersionSwitcher = ({
  trackId,
  currentVersionId,
  onVersionChange,
}: VersionSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: versionsData } = useTrackVariants(trackId);
  const playTrackWithQueue = useAudioPlayerStore((state) => state.playTrackWithQueue);

  const handleVersionSwitch = useCallback(
    async (versionId: string, versionNumber: number) => {
      try {
        logInfo(`Switching to version ${versionNumber}`, 'VersionSwitcher', {
          trackId,
          versionId,
        });

        // Если передан колбэк, используем его
        if (onVersionChange) {
          onVersionChange(versionId, versionNumber);
        } else if (versionsData) {
          // Иначе воспроизводим версию
          const version = versionsData.variants.find((v) => v.id === versionId);
          if (version && version.audioUrl) {
            playTrackWithQueue(
              {
                id: version.id,
                title: versionsData.mainTrack.title,
                audio_url: version.audioUrl,
                cover_url: version.coverUrl || versionsData.mainTrack.coverUrl,
                duration: version.duration,
                style_tags: versionsData.mainTrack.styleTags,
                lyrics: version.lyrics,
                status: 'completed',
              },
              []
            );
          }
        }

        toast.success(`Переключено на версию ${versionNumber}`);
        setIsOpen(false);
      } catch (error) {
        toast.error('Ошибка переключения версии');
        logInfo(
          'Version switch failed',
          'VersionSwitcher',
          error instanceof Error ? { error: error.message } : { error: String(error) }
        );
      }
    },
    [trackId, onVersionChange, versionsData, playTrackWithQueue]
  );

  // Если нет версий, не показываем переключатель
  if (!versionsData || versionsData.variants.length === 0) {
    return null;
  }

  const currentVersion = versionsData.variants.find((v) => v.id === currentVersionId);
  const currentVersionNumber = currentVersion ? currentVersion.variantIndex + 1 : 1;

  return (
    <DropdownMenuSub open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuSubTrigger className="flex items-center gap-2">
        <span>Сменить версию</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
          V{currentVersionNumber}
        </Badge>
        <ChevronRight className="w-3 h-3 ml-auto" />
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-48">
        {versionsData.variants.map((version, index) => {
          const versionNumber = index + 1;
          const isCurrent = version.id === currentVersionId;
          const isPreferred = version.id === versionsData.preferredVariant?.id;

          return (
            <DropdownMenuItem
              key={version.id}
              onClick={() => handleVersionSwitch(version.id, versionNumber)}
              className="flex items-center justify-between"
            >
              <span>Версия {versionNumber}</span>
              <div className="flex items-center gap-1">
                {isCurrent && (
                  <Badge variant="default" className="text-[10px] px-1 py-0">
                    Текущая
                  </Badge>
                )}
                {isPreferred && !isCurrent && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    Главная
                  </Badge>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
