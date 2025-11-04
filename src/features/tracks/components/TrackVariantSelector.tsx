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
    <div ref={containerRef} className="flex items-center gap-1">
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
                  "h-7 px-2 rounded-md",
                  "flex items-center gap-1",
                  "bg-background/95 text-xs font-semibold",
                  "border border-border/50 shadow-sm transition-all",
                  "hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                )}
                aria-label={`Активная версия: V${displayIndex}${isMasterVersion ? ' (MASTER)' : ''}`}
                aria-haspopup="true"
                aria-expanded={false}
              >
                <span
                  className={cn(
                    "inline-flex h-5 min-w-[22px] items-center justify-center rounded-sm px-1",
                    isMasterVersion
                      ? "bg-[#4285F4] text-white"
                      : "bg-muted text-foreground"
                  )}
                >
                  {`V${displayIndex}`}
                </span>
                {isMasterVersion && (
                  <span className="ml-0.5 text-[10px] font-bold tracking-wide text-amber-500">MASTER</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Активная версия: V{displayIndex}{isMasterVersion ? ' · MASTER' : ''}</TooltipContent>
          </Tooltip>
        )}

        {isOpen && (
          <div className="flex items-center gap-1.5 transition-all">
            {Array.from({ length: totalVersions }).map((_, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
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
                  {index === 0 ? 'Оригинал' : `Вариант ${index}`}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};