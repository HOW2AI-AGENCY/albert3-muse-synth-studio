/**
 * @redesigned 2025-11-07 - Modern UI with improved icons, animations, and mobile support
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Star, Sparkles } from 'lucide-react';
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
  // Используем versionCount (правильно фильтрованное количество) вместо allVersions.length
  const totalVersions = versionCount + 1;

  if (isLoading || totalVersions < 2) {
    return null;
  }
  const displayIndex = currentVersionIndex + 1;
  const currentVersion = allVersions[currentVersionIndex];
  const isMasterVersion = currentVersion?.isMasterVersion;

  const isActive = (index: number) => index === currentVersionIndex;

  return (
    <div ref={containerRef} className="flex items-center gap-1.5">
      {/* Кнопка установки мастер-версии */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSetMaster}
            disabled={isMasterVersion || isSettingMaster}
            className={cn(
              "h-8 w-8 p-0 rounded-full min-w-[32px] min-h-[32px]",
              "transition-all duration-300",
              isMasterVersion
                ? "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 opacity-60 hover:opacity-100"
            )}
          >
            {isMasterVersion ? (
              <Sparkles
                className="h-4.5 w-4.5 fill-amber-500 text-amber-500 animate-pulse"
              />
            ) : (
              <Star
                className="h-4 w-4"
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          {isMasterVersion ? 'Мастер-версия' : 'Установить как мастер-версию'}
        </TooltipContent>
      </Tooltip>

      {/* Переключатель: свернутый (иконка-счетчик) → раскрытый (кнопки V1/V2) */}
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
                  "h-8 px-2.5 rounded-lg min-w-[44px]",
                  "flex items-center gap-1.5",
                  "text-xs font-bold",
                  "border shadow-sm transition-all duration-200",
                  "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50",
                  isMasterVersion
                    ? "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-200 dark:border-amber-800 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-950/60 dark:hover:to-orange-950/60"
                    : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/50 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-950/50 dark:hover:to-indigo-950/50"
                )}
                aria-label={`Активная версия: V${displayIndex}${isMasterVersion ? ' (MASTER)' : ''}`}
                aria-haspopup="true"
                aria-expanded={false}
              >
                {isMasterVersion && (
                  <Sparkles className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                )}
                <span
                  className={cn(
                    "inline-flex items-center justify-center font-bold",
                    isMasterVersion
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-blue-700 dark:text-blue-400"
                  )}
                >
                  {`V${displayIndex}`}
                </span>
                {isMasterVersion && (
                  <span className="text-[9px] font-extrabold tracking-wider text-amber-600 dark:text-amber-500 uppercase">Master</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="font-medium">
              Активная версия: V{displayIndex}{isMasterVersion ? ' · MASTER' : ''}
            </TooltipContent>
          </Tooltip>
        )}

        {isOpen && (
          <div className="flex items-center gap-2 transition-all animate-in fade-in slide-in-from-left-2 duration-200">
            {Array.from({ length: totalVersions }).map((_, index) => {
              const isThisActive = isActive(index);
              const versionAtIndex = allVersions[index];
              const isThisMaster = versionAtIndex?.isMasterVersion;

              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isThisActive ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const targetIndex = index < totalVersions ? index : 0;
                        onVersionChange(targetIndex);
                        // После выбора — сворачиваем обратно
                        setIsOpen(false);
                      }}
                      onBlur={(e) => {
                        // Если фокус уходит из группы — закрываем
                        if (!e.relatedTarget || !(containerRef.current?.contains(e.relatedTarget as Node))) {
                          setIsOpen(false);
                        }
                      }}
                      aria-label={index === 0 ? 'Версия 1 (Оригинал)' : `Версия ${index + 1}`}
                      aria-pressed={isThisActive}
                      className={cn(
                        "h-9 w-9 p-0 rounded-full text-sm font-bold relative min-w-[36px] min-h-[36px]",
                        "transition-all duration-200 ease-in-out",
                        "border-2 shadow-sm",
                        isThisActive
                          ? isThisMaster
                            ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white border-transparent hover:from-amber-600 hover:to-orange-600 shadow-lg scale-110"
                            : "bg-gradient-to-br from-blue-500 to-indigo-500 text-white border-transparent hover:from-blue-600 hover:to-indigo-600 shadow-lg scale-110"
                          : isThisMaster
                            ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                            : "bg-background/90 text-muted-foreground border-border/60 hover:bg-background hover:border-primary/50"
                      )}
                    >
                      {isThisMaster && (
                        <Sparkles className="absolute -top-1 -right-1 h-3 w-3 fill-amber-500 text-amber-500" />
                      )}
                      {index + 1}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="font-medium">
                    {index === 0 ? 'Оригинал' : `Вариант ${index}`}
                    {isThisMaster && <span className="ml-1 text-amber-500">★ Master</span>}
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