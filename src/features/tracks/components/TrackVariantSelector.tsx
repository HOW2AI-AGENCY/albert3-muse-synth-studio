import React, { useCallback, useState, useRef, useEffect } from 'react';
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
  const { versionCount, allVersions, isLoading, setMasterVersion } = useTrackVersions(trackId, true);
  const { toast } = useToast();
  const [isSettingMaster, setIsSettingMaster] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне блока
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Переключение на следующую версию
  // Удалено как неиспользуемое: смена версии реализована кнопками ниже

  // Установка текущей версии как мастер-версии
  const handleSetMaster = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isSettingMaster || isLoading) return;
    
    const currentVersion = allVersions[currentVersionIndex];
    // Нельзя назначать основную версию (sourceVersionNumber === 0) как мастер,
    // так как основная версия живёт в таблице tracks, а мастер-флаг хранится в track_versions
    const isMainVersion = currentVersion?.sourceVersionNumber === 0;
    if (!currentVersion || currentVersion.isMasterVersion || isMainVersion) {
      if (isMainVersion) {
        toast({
          title: 'Недоступно',
          description: 'Основная версия не может быть назначена как мастер напрямую',
        });
      }
      return;
    }
    
    setIsSettingMaster(true);
    
    try {
      // Централизованная установка мастер-версии через useTrackVersions
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
  // Используем versionCount (правильно фильтрованное количество) вместо allVersions.length
  const totalVersions = versionCount + 1;

  if (isLoading || totalVersions < 2) {
    return null;
  }
  const displayIndex = currentVersionIndex + 1;
  const currentVersion = allVersions[currentVersionIndex];
  const isMasterVersion = currentVersion?.isMasterVersion;
  const isMainVersion = currentVersion?.sourceVersionNumber === 0;

  const isActive = (index: number) => index === currentVersionIndex;

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      {/* ✅ REDESIGNED: Master version button with better visibility */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSetMaster}
            disabled={isMasterVersion || isSettingMaster || isMainVersion}
            aria-label={isMasterVersion ? 'Мастер-версия' : (isMainVersion ? 'Основная версия' : 'Установить как мастер')}
            className={cn(
              "h-8 w-8 p-0 rounded-lg",
              "transition-all duration-300 ease-in-out",
              "backdrop-blur-sm shadow-sm",
              isMasterVersion
                ? "bg-amber-500/90 text-white hover:bg-amber-600 scale-105"
                : "bg-background/80 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 opacity-70 hover:opacity-100"
            )}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                isMasterVersion && "fill-current drop-shadow-glow"
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          {isMasterVersion ? '⭐ Мастер-версия' : (isMainVersion ? 'Основная версия' : 'Установить как мастер')}
        </TooltipContent>
      </Tooltip>

      {/* ✅ REDESIGNED: Version selector with better UX */}
      <div
        className={cn("flex items-center gap-1.5", className)}
        role="group"
        aria-label="Переключатель версий"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            setIsOpen(false);
          }
          if (!isOpen && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        {/* Collapsed state - single badge */}
        {!isOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(true);
                }}
                className={cn(
                  "h-8 px-3 rounded-lg",
                  "flex items-center gap-1.5",
                  "backdrop-blur-sm shadow-md",
                  "text-sm font-bold",
                  "transition-all duration-300 ease-in-out",
                  "hover:scale-105 hover:shadow-lg",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  isMasterVersion
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "bg-background/90 border border-border/60 text-foreground hover:bg-background"
                )}
                aria-label={`Активная версия: V${displayIndex}${isMasterVersion ? ' (MASTER)' : ''}`}
                aria-haspopup="true"
                aria-expanded={false}
              >
                <span className="tracking-wide">V{displayIndex}</span>
                {isMasterVersion && (
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300 animate-pulse" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="font-medium">
              Версия {displayIndex} из {totalVersions}{isMasterVersion ? ' ⭐' : ''}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Expanded state - all version buttons */}
        {isOpen && (
          <div className="flex items-center gap-2 transition-all animate-in fade-in slide-in-from-right-2 duration-300">
            {Array.from({ length: totalVersions }).map((_, index) => {
              const isVersionActive = isActive(index);
              const versionIsIndex = allVersions[index];
              const isVersionMaster = versionIsIndex?.isMasterVersion;

              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // ✅ FIX: Используем корректный индекс версии
                        const targetIndex = Math.min(index, totalVersions - 1);
                        onVersionChange(targetIndex);
                        setIsOpen(false);
                      }}
                      onBlur={(e) => {
                        if (!e.relatedTarget || !(containerRef.current?.contains(e.relatedTarget as Node))) {
                          setIsOpen(false);
                        }
                      }}
                      aria-label={index === 0 ? 'Версия 1 (Оригинал)' : `Версия ${index + 1}`}
                      aria-pressed={isVersionActive}
                      className={cn(
                        "h-9 w-9 p-0 rounded-lg text-sm font-bold relative",
                        "transition-all duration-300 ease-in-out",
                        "shadow-md",
                        isVersionActive
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-2 border-blue-400 scale-110 shadow-xl"
                          : "bg-background/90 border border-border/60 text-muted-foreground hover:bg-background hover:scale-105 hover:border-primary/50",
                      )}
                    >
                      {index + 1}
                      {isVersionMaster && (
                        <Star className="absolute -top-1 -right-1 h-3 w-3 fill-amber-400 text-amber-400" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="font-medium">
                    {index === 0 ? '📀 Оригинал' : `🎵 Вариант ${index}`}
                    {isVersionMaster && ' ⭐'}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};