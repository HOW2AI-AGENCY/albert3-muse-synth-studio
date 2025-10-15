import { memo, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp, Loader2, RefreshCw, Plus, Check } from '@/utils/iconImports';
import { useStyleRecommendations } from '@/services/ai/style-recommendations';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';

interface StyleRecommendationsInlineProps {
  prompt: string;
  currentTags: string[];
  genre?: string;
  onApplyTags: (tags: string[]) => void;
  className?: string;
}

export const StyleRecommendationsInline = memo(({
  prompt,
  currentTags,
  genre,
  onApplyTags,
  className,
}: StyleRecommendationsInlineProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasManuallyTriggered, setHasManuallyTriggered] = useState(false);

  const hasMinimumContext = prompt.length >= 10;
  const currentTagsSet = useMemo(() => new Set(currentTags), [currentTags]);

  const { data, isLoading, isError, refetch } = useStyleRecommendations(
    {
      context: prompt,
      genre,
      currentTags,
    },
    {
      // ✅ FIX: Запускать ТОЛЬКО при ручном триггере
      enabled: hasManuallyTriggered && hasMinimumContext,
      staleTime: 1000 * 60 * 5, // 5 минут кэш
      // ✅ ВАЖНО: Не перезапускать при изменении currentTags
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  const handleToggle = () => {
    logger.debug('AI recommendations toggled', 'StyleRecommendationsInline', {
      isExpanded,
      promptLength: prompt.length,
      hasContext: hasMinimumContext,
    });
    
    if (!isExpanded && !hasManuallyTriggered) {
      setHasManuallyTriggered(true);
      logger.info('AI recommendations manual trigger', 'StyleRecommendationsInline', {
        prompt: prompt.substring(0, 50),
      });
    }
    setIsExpanded(!isExpanded);
  };

  const handleApplyTag = (tag: string) => {
    if (!currentTagsSet.has(tag)) {
      logger.debug('Tag applied from AI recommendations', 'StyleRecommendationsInline', { tag });
      onApplyTags([tag]);
    }
  };

  const handleApplyAll = () => {
    if (data?.tags) {
      const newTags = data.tags.filter(tag => !currentTagsSet.has(tag));
      if (newTags.length > 0) {
        logger.info('All AI recommendations applied', 'StyleRecommendationsInline', {
          tagsCount: newTags.length,
          tags: newTags,
        });
        onApplyTags(newTags);
      }
    }
  };

  const newTagsCount = useMemo(() => {
    if (!data?.tags) return 0;
    return data.tags.filter(tag => !currentTagsSet.has(tag)).length;
  }, [data?.tags, currentTagsSet]);

  const allTags = useMemo(() => {
    if (!data) return [];
    const tags: Array<{ text: string; category: string }> = [];
    
    if (data.tags) {
      data.tags.forEach(tag => tags.push({ text: tag, category: 'style' }));
    }
    if (data.instruments) {
      data.instruments.forEach(tag => tags.push({ text: tag, category: 'instrument' }));
    }
    if (data.techniques) {
      data.techniques.forEach(tag => tags.push({ text: tag, category: 'technique' }));
    }
    
    return tags;
  }, [data]);

  if (!hasMinimumContext) {
    return (
      <div className={cn("rounded-lg border border-dashed border-muted-foreground/30 p-3", className)}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Введите описание (мин. 10 символов) для AI подсказок</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-primary/20 bg-card/50", className)}>
      <Button
        type="button"
        variant="ghost"
        onClick={handleToggle}
        disabled={isLoading}
        className="w-full justify-between h-auto py-2.5 px-3 hover:bg-primary/5"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            AI Подсказки
            {newTagsCount > 0 && (
              <span className="ml-1.5 text-xs text-primary">({newTagsCount} новых)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </Button>

      {isExpanded && (
        <div className="border-t border-primary/10 p-3 space-y-3 animate-accordion-down">
          {isLoading && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Анализируем стиль...
            </div>
          )}

          {isError && (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-destructive">Не удалось загрузить рекомендации</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Повторить
              </Button>
            </div>
          )}

          {!isLoading && !isError && allTags.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag, index) => {
                  const isAdded = currentTagsSet.has(tag.text);
                  return (
                    <button
                      key={`${tag.text}-${index}`}
                      type="button"
                      onClick={() => handleApplyTag(tag.text)}
                      disabled={isAdded}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
                        "border hover:scale-105",
                        isAdded
                          ? "bg-primary/10 border-primary/30 text-primary cursor-default"
                          : "bg-background border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                      )}
                      title={tag.category}
                    >
                      {isAdded ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      {tag.text}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                {newTagsCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplyAll}
                    className="flex-1 h-7 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20"
                  >
                    <Sparkles className="h-3 w-3 mr-1.5" />
                    Применить все ({newTagsCount})
                  </Button>
                )}
                
                {!isLoading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    className="h-7 px-3 text-xs"
                    title="Обновить рекомендации"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {data?.vocalStyle && (
                <div className="pt-2 border-t border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Вокал:</span> {data.vocalStyle}
                  </p>
                </div>
              )}
            </>
          )}

          {!isLoading && !isError && allTags.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Не удалось сгенерировать рекомендации. Попробуйте уточнить описание.
            </div>
          )}
        </div>
      )}
    </div>
  );
});

StyleRecommendationsInline.displayName = 'StyleRecommendationsInline';
