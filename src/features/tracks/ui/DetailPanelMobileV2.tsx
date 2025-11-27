/**
 * @file DetailPanelMobileV2.tsx
 * @description Мобильная панель деталей трека с полным функционалом
 * 
 * Особенности:
 * - Полноэкранный Sheet для мобильных устройств (95vh)
 * - Табы: Обзор, Текст, Версии, Анализ
 * - Удобное управление версиями и стемами
 * - Адаптивный дизайн с touch-friendly элементами
 * - Липкая навигация по табам
 * 
 * @version 2.0.0
 */
import { memo, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import type { Track } from '@/types/track.types';
import { OverviewContent } from './tabs/OverviewContent';
import { LyricsContent } from './tabs/LyricsContent';
import { VersionsStemsContent } from './tabs/VersionsStemsContent';
import { useTracks } from '@/hooks/useTracks';

interface DetailPanelMobileV2Props {
  track: Track;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  onRemix?: (track: any) => void;
}

/**
 * Мобильная панель деталей трека
 * 
 * Реализует:
 * - Управление удалением с подтверждением через toast
 * - Автоматическое закрытие после удаления
 * - Callback для родительского компонента
 */
const DetailPanelMobileV2Component = ({ track, open, onOpenChange, onDelete }: DetailPanelMobileV2Props) => {
  const { deleteTrack } = useTracks();

  /**
   * Обработчик удаления трека
   * - Вызывает API удаления через useTracks hook
   * - Показывает toast уведомление об успехе/ошибке
   * - Закрывает панель после успешного удаления
   * - Вызывает callback родителя для обновления списка
   */
  const handleDelete = useCallback(async () => {
    try {
      await deleteTrack(track.id);
      toast({ 
        title: '✅ Трек успешно удален',
        description: `"${track.title}" удален из библиотеки` 
      });
      onOpenChange(false);
      onDelete?.();
    } catch (error) {
      toast({ 
        title: '❌ Ошибка при удалении трека', 
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive' 
      });
    }
  }, [deleteTrack, track.id, onOpenChange, onDelete]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* 
        Полноэкранная панель снизу (95vh)
        - Липкий заголовок с кнопками
        - Скроллируемый контент
        - Backdrop blur для красоты
      */}
      <SheetContent 
        side="bottom" 
        className="h-[95vh] p-0 flex flex-col rounded-t-3xl border-t-2 border-border/50"
      >
        {/* ============= HEADER: Title + Actions ============= */}
        <SheetHeader className="p-4 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="flex items-center justify-between gap-3">
            {/* Close button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)} 
              className="h-10 w-10 rounded-full hover:bg-muted/50 flex-shrink-0"
              aria-label="Закрыть панель"
            >
              <X className="h-5 w-5" />
            </Button>
            
            {/* Track title - centered, truncated */}
            <SheetTitle className="text-base font-semibold truncate flex-1 text-center">
              {track.title}
            </SheetTitle>
            
            {/* Delete button - red on hover */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDelete} 
              className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
              aria-label="Удалить трек"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        {/* ============= SCROLLABLE CONTENT ============= */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Track info header */}
          <div className="px-4 py-6 bg-gradient-to-b from-muted/20 to-transparent">
            <h1 className="text-2xl font-bold mb-2 leading-tight">{track.title}</h1>
            <p className="text-sm text-muted-foreground mb-1">
              {track.style_tags?.join(', ') || 'AI Generated Music'}
            </p>
            {track.provider && (
              <p className="text-xs text-muted-foreground/70 capitalize">
                Создано через {track.provider}
              </p>
            )}
          </div>

          {/* ============= TABS NAVIGATION ============= */}
          <Tabs defaultValue="overview" className="w-full">
            {/* 
              Sticky tabs bar:
              - Закреплен при скролле
              - Backdrop blur для читаемости
              - 4 таба: Обзор, Текст, Версии, Анализ
            */}
            <TabsList className="sticky top-0 z-10 grid w-full grid-cols-4 bg-background/95 backdrop-blur-md border-b border-border/30 rounded-none h-12">
              <TabsTrigger 
                value="overview" 
                className="text-xs sm:text-sm data-[state=active]:bg-primary/10"
              >
                Обзор
              </TabsTrigger>
              <TabsTrigger 
                value="lyrics" 
                className="text-xs sm:text-sm data-[state=active]:bg-primary/10"
              >
                Текст
              </TabsTrigger>
              <TabsTrigger 
                value="versions" 
                className="text-xs sm:text-sm data-[state=active]:bg-primary/10"
              >
                Версии
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="text-xs sm:text-sm data-[state=active]:bg-primary/10"
              >
                Анализ
              </TabsTrigger>
            </TabsList>

            {/* ============= TAB CONTENTS ============= */}
            <div className="p-4 pb-8">
              {/* Обзор: Статистика, промпты, технические детали */}
              <TabsContent value="overview" className="mt-0 space-y-4">
                <OverviewContent track={track as any} />
              </TabsContent>

              {/* Текст песни: Структурированный просмотр + кнопка копирования */}
              <TabsContent value="lyrics" className="mt-0">
                <LyricsContent lyrics={track.lyrics || ''} trackId={track.id} />
              </TabsContent>

              {/* Версии и стемы: Управление вариантами трека */}
              <TabsContent value="versions" className="mt-0 space-y-4">
                <VersionsStemsContent track={track as any} />
              </TabsContent>

              {/* AI Анализ: Coming soon */}
              <TabsContent value="analysis" className="mt-0">
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-3 p-6">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    AI-анализ скоро будет доступен
                  </p>
                  <p className="text-xs text-muted-foreground/70 max-w-[280px]">
                    Здесь появится детальный анализ жанра, настроения, BPM и других характеристик
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const DetailPanelMobileV2 = memo(DetailPanelMobileV2Component);
