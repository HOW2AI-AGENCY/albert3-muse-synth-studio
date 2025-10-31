import { useMemo } from "react";
import { Loader2, RefreshCcw, Sparkles } from "@/utils/iconImports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MUSIC_STYLES, getCategoryName, getRelatedStyles, getStyleById } from "@/data/music-styles";
import { useStyleRecommendations } from "@/services/ai/style-recommendations";
import type { StyleRecommendationRequest } from "@/types/styles";
import type { AdvancedPromptRequest } from "@/services/ai/advanced-prompt-generator";
const normaliseTag = (tag: string) => tag.trim().toLowerCase();
const normaliseToId = (tag: string) => normaliseTag(tag).replace(/\s+/g, "-");
const findStyleForTag = (tag: string) => {
  const normalisedId = normaliseToId(tag);
  const direct = getStyleById(normalisedId);
  if (direct) {
    return direct;
  }
  const normalisedTag = normaliseTag(tag);
  return MUSIC_STYLES.find(style => style.name.toLowerCase() === normalisedTag) ?? MUSIC_STYLES.find(style => style.tags.some(styleTag => styleTag.toLowerCase() === normalisedTag)) ?? null;
};
interface StyleRecommendationsPanelProps extends StyleRecommendationRequest {
  className?: string;
  onApplyTags?: (tags: string[]) => void;
  onGenerateAdvancedPrompt?: (request: AdvancedPromptRequest) => void;
  currentPrompt?: string;
  currentLyrics?: string;
  isGeneratingPrompt?: boolean;
}
export const StyleRecommendationsPanel = ({
  className,
  mood,
  genre,
  context,
  currentTags,
  onApplyTags,
  onGenerateAdvancedPrompt,
  currentPrompt,
  currentLyrics,
  isGeneratingPrompt = false
}: StyleRecommendationsPanelProps) => {
  const sanitisedTags = useMemo(() => currentTags?.filter(tag => Boolean(tag?.trim())) ?? [], [currentTags]);
  const hasInput = Boolean(mood && mood.trim().length > 0 || genre && genre.trim().length > 0 || context && context.trim().length > 0 || sanitisedTags.length > 0);
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch
  } = useStyleRecommendations({
    mood,
    genre,
    context,
    currentTags: sanitisedTags
  }, {
    enabled: hasInput,
    retry: 1
  });
  const recommendedTags = useMemo(() => data?.tags ?? [], [data?.tags]);
  const {
    graphNodes,
    highlightedStyleIds
  } = useMemo(() => {
    const styleMap = new Map<string, ReturnType<typeof getStyleById>>();
    const registerStyle = (tag: string) => {
      const style = findStyleForTag(tag);
      if (style) {
        styleMap.set(style.id, style);
      }
    };
    sanitisedTags.forEach(registerStyle);
    recommendedTags.forEach(registerStyle);
    const nodes = Array.from(styleMap.values()).filter((style): style is NonNullable<ReturnType<typeof getStyleById>> => Boolean(style)).map(style => ({
      style,
      related: getRelatedStyles(style.id).slice(0, 6)
    })).sort((a, b) => b.style.popularity - a.style.popularity).slice(0, 6);
    return {
      graphNodes: nodes,
      highlightedStyleIds: new Set(Array.from(styleMap.keys()))
    };
  }, [recommendedTags, sanitisedTags]);
  const isPending = isLoading || isFetching;
  return <div className={cn("space-y-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold">AI рекомендации стиля</h3>
          <p className="text-xs text-muted-foreground">
            Предложения формируются на основе жанра, настроения и существующих тегов.
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => refetch()} disabled={!hasInput || isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
      </div>

      {!hasInput && <div className="rounded-md border border-dashed bg-muted/40 p-4 text-xs text-muted-foreground">
          Добавьте жанр, настроение или существующие теги трека, чтобы получить рекомендации.
        </div>}

      {hasInput && isError && <div className="space-y-2 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-xs">
          <p className="font-medium text-destructive">Не удалось загрузить рекомендации.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Повторить попытку
          </Button>
        </div>}

      {hasInput && isPending && <div className="flex items-center gap-2 rounded-md border bg-muted/60 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Подбираем стили...</span>
        </div>}

      {hasInput && !isPending && !isError && data && <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Рекомендованные теги</h4>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onApplyTags?.(recommendedTags)} 
                disabled={recommendedTags.length === 0 || !onApplyTags}
                className="flex-1 sm:flex-initial min-w-[120px]"
              >
                Применить теги
              </Button>
              {onGenerateAdvancedPrompt && currentPrompt && data && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => {
                    onGenerateAdvancedPrompt({
                      styleRecommendations: data,
                      currentPrompt,
                      currentLyrics,
                      genre,
                      mood
                    });
                  }}
                  disabled={isGeneratingPrompt}
                  className="flex-1 sm:flex-initial min-w-[140px]"
                >
                  {isGeneratingPrompt ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Создать промпт
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {recommendedTags.length > 0 ? <div className="flex flex-wrap gap-1.5">
                {recommendedTags.map(tag => <Badge key={tag} variant="secondary" className="text-xs px-2 py-1">
                    {tag}
                  </Badge>)}
              </div> : <p className="text-xs text-muted-foreground">AI не предложил дополнительные теги для текущего ввода.</p>}

            {data.instruments.length > 0 && <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Инструменты</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.instruments.map(instrument => <Badge key={instrument} variant="outline" className="text-xs">
                      {instrument}
                    </Badge>)}
                </div>
              </div>}

            {data.techniques.length > 0 && <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Техники и эффекты</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.techniques.map(technique => <Badge key={technique} variant="outline" className="text-xs">
                      {technique}
                    </Badge>)}
                </div>
              </div>}

            {data.vocalStyle && <div className="rounded-md border bg-background/60 p-3 text-xs">
                <p className="font-medium text-muted-foreground">Вокальный подход</p>
                <p className="mt-1 text-foreground/80">{data.vocalStyle}</p>
              </div>}

            {data.references && data.references.length > 0 && <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Референсы</p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {data.references.map(reference => <li key={reference}>{reference}</li>)}
                </ul>
              </div>}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Граф связей стилей</h4>
              <p className="text-[11px] text-muted-foreground">
                Показаны основные стили и их ближайшие связи.
              </p>
            </div>
            {graphNodes.length > 0 ? <ScrollArea className="max-h-64 pr-2">
                <div className="space-y-3">
                  {graphNodes.map(({
              style,
              related
            }) => <div key={style.id} className="rounded-lg border bg-card/60 p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{style.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{style.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[11px]">
                          {getCategoryName(style.category)}
                        </Badge>
                      </div>
                      {related.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">
                          {related.map(relatedStyle => <Badge key={relatedStyle.id} variant={highlightedStyleIds.has(relatedStyle.id) ? "default" : "secondary"} className="text-xs">
                              {relatedStyle.name}
                            </Badge>)}
                        </div>}
                    </div>)}
                </div>
              </ScrollArea> : <p className="text-xs text-muted-foreground">
                Недостаточно данных для построения графа. Попробуйте уточнить жанр или добавить теги.
              </p>}
          </div>

          
        </div>}
    </div>;
};