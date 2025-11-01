import React, { useCallback, useState } from 'react';
import { Star, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTrackVersions } from '@/features/tracks/hooks';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/utils/logger';

interface TrackVariantSelectorProps {
  trackId: string;
  currentVersionIndex: number;
  onVersionChange: (versionIndex: number) => void;
  className?: string;
}

export const TrackVariantSelector: React.FC<TrackVariantSelectorProps> = ({ 
  trackId,
  currentVersionIndex,
  onVersionChange,
  className 
}) => {
  const { versionCount, allVersions, setMasterVersion, isLoading } = useTrackVersions(trackId, true);
  const { toast } = useToast();
  const [isSettingMaster, setIsSettingMaster] = useState(false);

  // Переключение на следующую версию
  const handleNextVersion = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const totalVersions = versionCount + 1;
    const nextIndex = (currentVersionIndex + 1) % totalVersions;
    
    onVersionChange(nextIndex);
  }, [currentVersionIndex, versionCount, onVersionChange]);

  // Установка текущей версии как мастер-версии
  const handleSetMaster = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isSettingMaster || isLoading) return;
    
    const currentVersion = allVersions[currentVersionIndex];
    if (!currentVersion || currentVersion.isMasterVersion) {
      return;
    }
    
    setIsSettingMaster(true);
    
    try {
      await setMasterVersion(currentVersion.id);
      
      toast({
        title: 'Мастер-версия установлена',
        description: `Версия ${currentVersionIndex + 1} теперь основная`,
      });
    } catch (error) {
      logError('Failed to set master version', error as Error, 'TrackVariantSelector');
      toast({
        title: 'Ошибка',
        description: 'Не удалось установить мастер-версию',
        variant: 'destructive',
      });
    } finally {
      setIsSettingMaster(false);
    }
  }, [currentVersionIndex, allVersions, setMasterVersion, isSettingMaster, isLoading, toast]);

  // ✅ FIX: Не показываем селектор если меньше 2 версий
  if (isLoading || allVersions.length < 2) {
    return null;
  }

  const totalVersions = versionCount + 1;
  const displayIndex = currentVersionIndex + 1;
  const currentVersion = allVersions[currentVersionIndex];
  const isMasterVersion = currentVersion?.isMasterVersion;

  return (
    <div className="flex items-center gap-1">
      {/* Кнопка установки мастер-версии */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSetMaster}
              disabled={isMasterVersion || isSettingMaster}
              className={cn(
                "h-7 w-7 p-0",
                "transition-all duration-200",
                isMasterVersion 
                  ? "text-amber-500 hover:text-amber-600" 
                  : "text-muted-foreground hover:text-amber-500 opacity-60 hover:opacity-100"
              )}
            >
              <Star 
                className={cn(
                  "h-4 w-4",
                  isMasterVersion && "fill-current"
                )} 
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isMasterVersion ? 'Мастер-версия' : 'Установить как мастер-версию'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Переключатель версий */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNextVersion}
              className={cn(
                "h-7 px-2.5 gap-1.5 text-xs font-semibold",
                "bg-background/95 hover:bg-background backdrop-blur-md",
                "border border-border/50 shadow-lg",
                "transition-all duration-200 hover:scale-105 active:scale-95",
                className
              )}
            >
              <span className="tabular-nums">{displayIndex}/{totalVersions}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Переключить вариант трека</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};