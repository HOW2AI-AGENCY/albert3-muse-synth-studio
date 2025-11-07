/**
 * Упрощенный селектор версий для Library и DetailPanel
 * Phase 2.1 - Простой UI для переключения версий
 *
 * @redesigned 2025-11-07 - Modern UI with improved icons and mobile support
 */

import React, { useMemo } from 'react';
import { Play, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getVersionLabel } from '@/utils/versionLabels';

interface VersionOption {
  id: string;
  variant_index: number;
  is_preferred_variant: boolean;
  is_primary_variant?: boolean;
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
    () => versions.find(v => v.is_preferred_variant),
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
        <Badge
          variant={version.is_preferred_variant ? "default" : "outline"}
          className={cn(
            "text-xs font-medium h-7 px-3 gap-1.5",
            version.is_preferred_variant && "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
          )}
        >
          {version.is_preferred_variant && (
            <Star className="h-3.5 w-3.5 fill-current" />
          )}
          {getVersionLabel({
            versionNumber: version.variant_index + 1,
            isMaster: version.is_preferred_variant,
          })}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Быстрая кнопка "Играть мастер" */}
      {showPlayMasterButton && masterVersion && onPlayMaster && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPlayMaster();
              }}
              className={cn(
                "h-9 px-3 gap-1.5 min-w-[44px]",
                "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
                "border-amber-200 dark:border-amber-800",
                "hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-950/40 dark:hover:to-orange-950/40",
                "transition-all duration-200 shadow-sm"
              )}
            >
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <Play className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-medium">
            Воспроизвести мастер-версию
          </TooltipContent>
        </Tooltip>
      )}

      {/* Селектор версий */}
      <Select
        value={selectedVersionId}
        onValueChange={onSelect}
      >
        <SelectTrigger className={cn(
          "h-9 w-[200px] text-sm font-medium min-w-[44px]",
          "shadow-sm transition-all duration-200",
          "hover:shadow-md hover:border-primary/50"
        )}>
          <SelectValue>
            {selectedVersion ? (
              <div className="flex items-center gap-2">
                {selectedVersion.is_preferred_variant && (
                  <Sparkles className="h-4 w-4 fill-amber-500 text-amber-500 animate-pulse" />
                )}
                <span className={cn(
                  selectedVersion.is_preferred_variant && "text-amber-700 dark:text-amber-400 font-semibold"
                )}>
                  {getVersionLabel({
                    versionNumber: selectedVersion.variant_index + 1,
                    isMaster: selectedVersion.is_preferred_variant,
                  })}
                </span>
              </div>
            ) : (
              'Выберите версию'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-[200] min-w-[220px]">
          {versions.map((version) => (
            <SelectItem
              key={version.id}
              value={version.id}
              className={cn(
                "cursor-pointer transition-all duration-150",
                version.is_preferred_variant && "bg-amber-50/50 dark:bg-amber-950/20"
              )}
            >
              <div className="flex items-center gap-2.5 py-0.5">
                {version.is_preferred_variant ? (
                  <Sparkles className="h-4 w-4 fill-amber-500 text-amber-500 flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {version.variant_index + 1}
                    </span>
                  </div>
                )}
                <span className={cn(
                  "font-medium",
                  version.is_preferred_variant && "text-amber-700 dark:text-amber-400"
                )}>
                  {getVersionLabel({
                    versionNumber: version.variant_index + 1,
                    isMaster: version.is_preferred_variant,
                  })}
                </span>
                {version.created_at && (
                  <span className="text-xs text-muted-foreground ml-auto">
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
      <Badge
        variant="secondary"
        className={cn(
          "text-xs font-semibold h-7 px-2.5",
          "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
          "border border-blue-200/50 dark:border-blue-800/50",
          "text-blue-700 dark:text-blue-400"
        )}
      >
        {versions.length} {versions.length === 1 ? 'версия' : versions.length < 5 ? 'версии' : 'версий'}
      </Badge>
    </div>
  );
};