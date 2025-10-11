/**
 * Упрощенный селектор версий для Library и DetailPanel
 * Phase 2.1 - Простой UI для переключения версий
 */

import React, { useMemo } from 'react';
import { Play, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getVersionLabel } from '@/utils/versionLabels';

interface VersionOption {
  id: string;
  version_number: number;
  is_master: boolean;
  is_original?: boolean;
  created_at?: string;
}

interface SimpleVersionSelectorProps {
  versions: VersionOption[];
  selectedVersionId?: string;
  onSelect?: (versionId: string) => void;
  onPlayMaster?: () => void;
  className?: string;
  /** Показать кнопку "Играть мастер-версию" */
  showPlayMasterButton?: boolean;
}

export const SimpleVersionSelector: React.FC<SimpleVersionSelectorProps> = ({
  versions,
  selectedVersionId,
  onSelect,
  onPlayMaster,
  className,
  showPlayMasterButton = true,
}) => {
  const masterVersion = useMemo(
    () => versions.find(v => v.is_master),
    [versions]
  );

  const selectedVersion = useMemo(
    () => versions.find(v => v.id === selectedVersionId),
    [versions, selectedVersionId]
  );

  if (versions.length === 0) {
    return null;
  }

  // Если только одна версия, показываем простой badge
  if (versions.length === 1) {
    const version = versions[0];
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="text-xs">
          {getVersionLabel({
            versionNumber: version.version_number,
            isOriginal: version.is_original,
            isMaster: version.is_master,
          })}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Быстрая кнопка "Играть мастер" */}
      {showPlayMasterButton && masterVersion && onPlayMaster && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayMaster();
                }}
                className="h-8 px-2"
              >
                <Star className="h-3.5 w-3.5 mr-1 fill-primary text-primary" />
                <Play className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Воспроизвести мастер-версию
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Селектор версий */}
      <Select
        value={selectedVersionId}
        onValueChange={onSelect}
      >
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue>
            {selectedVersion ? (
              <div className="flex items-center gap-1.5">
                {selectedVersion.is_master && (
                  <Star className="h-3 w-3 fill-primary text-primary" />
                )}
                <span>
                  {getVersionLabel({
                    versionNumber: selectedVersion.version_number,
                    isOriginal: selectedVersion.is_original,
                    isMaster: selectedVersion.is_master,
                  })}
                </span>
              </div>
            ) : (
              'Выберите версию'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-[200]">
          {versions.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              <div className="flex items-center gap-2">
                {version.is_master && (
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                )}
                <span>
                  {getVersionLabel({
                    versionNumber: version.version_number,
                    isOriginal: version.is_original,
                    isMaster: version.is_master,
                  })}
                </span>
                {version.created_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(version.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Счетчик версий */}
      <Badge variant="secondary" className="text-xs">
        {versions.length} {versions.length === 1 ? 'версия' : versions.length < 5 ? 'версии' : 'версий'}
      </Badge>
    </div>
  );
};
