import React, { useCallback, useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

  const isActive = (index: number) => index === currentVersionIndex;

  return (
    <div className="flex items-center gap-1">
      {/* Кнопка установки мастер-версии */}
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

      {/* Переключатель двух версий + бейдж реального количества */}
      <div className={cn("flex items-center gap-1.5", className)}>
        {[0, 1].map((index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Если всего версий меньше данного индекса, перелистываем по кругу
                  const targetIndex = index < totalVersions ? index : 0;
                  onVersionChange(targetIndex);
                }}
                aria-label={index === 0 ? 'Версия 1 (Оригинал)' : 'Версия 2'}
                aria-pressed={isActive(index)}
                className={cn(
                  "h-7 w-7 p-0 rounded-full text-xs font-bold",
                  "transition-all duration-200 ease-in-out",
                  "border border-border/60 shadow-sm",
                  isActive(index) 
                    ? "bg-[#4285F4] text-white border-transparent hover:bg-[#3a78dc]"
                    : "bg-background/90 text-muted-foreground hover:bg-background",
                )}
              >
                {index + 1}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {index === 0 ? 'Оригинал' : 'Вариант 2'}
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Бейдж реального количества версий */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "h-7 min-w-[22px] px-1.5 rounded-md",
                "flex items-center justify-center",
                "bg-background/95 text-xs font-semibold tabular-nums",
                "border border-border/50 shadow-lg"
              )}
              aria-label={`Всего версий: ${totalVersions}`}
            >
              {totalVersions}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">Всего версий: {totalVersions}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};