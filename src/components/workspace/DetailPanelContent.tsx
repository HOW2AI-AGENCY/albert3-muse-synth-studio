import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, Eye, Heart, Calendar, Clock, ExternalLink, GitBranch, Music4, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackVersions, TrackVersionComparison, TrackStemsPanel, useTrackLike } from "@/features/tracks";
import type { TrackVersionMetadata } from "@/features/tracks/components/TrackVersionMetadataPanel";
import { TrackVersionSelector } from "@/features/tracks/ui/TrackVersionSelector";
import { CompactTrackHero } from "@/features/tracks/ui/CompactTrackHero";
import { EmptyStateCard } from "@/components/layout/EmptyStateCard";
import { StructuredLyrics } from "@/components/lyrics/StructuredLyrics";
import { StyleRecommendationsPanel } from "./StyleRecommendationsPanel";
import { useAudioPlayer } from "@/contexts/audio-player";
import { cn } from "@/lib/utils";
import type { StylePreset } from "@/types/styles";
import { getStyleById } from "@/data/music-styles";
import { AnalyticsService, viewSessionGuard } from "@/services/analytics.service";

interface Track {
  id: string;
  title: string;
  prompt: string;
  status: string;
  audio_url?: string;
  cover_url?: string;
  video_url?: string;
  suno_id?: string;
  genre?: string;
  mood?: string;
  is_public?: boolean;
  created_at?: string;
  user_id?: string;
  duration?: number;
  lyrics?: string;
  metadata?: TrackVersionMetadata | null;
  like_count?: number;
  view_count?: number;
  duration_seconds?: number;
  style_tags?: string[];
  model_name?: string;
}

interface TrackVersion {
  id: string;
  version_number: number;
  is_master: boolean;
  is_original?: boolean;
  source_version_number?: number | null;
  suno_id: string;
  audio_url: string;
  video_url?: string;
  cover_url?: string;
  lyrics?: string;
  duration?: number;
  metadata?: TrackVersionMetadata | null;
  created_at?: string;
}

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  version_id?: string | null;
  created_at?: string;
}

interface DetailPanelContentProps {
  track: Track;
  title: string;
  setTitle: (value: string) => void;
  genre: string;
  setGenre: (value: string) => void;
  mood: string;
  setMood: (value: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  isSaving: boolean;
  versions: TrackVersion[];
  stems: TrackStem[];
  onSave: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  loadVersionsAndStems: () => void;
  tabView?: "overview" | "versions" | "stems" | "details";
}

const formatDate = (date?: string) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    import('@/utils/logger').then(({ logWarn }) => {
      logWarn('Failed to format date', 'DetailPanel', {
        date,
        error: error instanceof Error ? error.message : String(error)
      });
    });
    return "—";
  }
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const DetailPanelContent = ({
  track,
  title,
  setTitle,
  genre,
  setGenre,
  mood,
  setMood,
  isPublic,
  setIsPublic,
  isSaving,
  versions,
  stems,
  onSave,
  onDownload,
  onShare,
  onDelete,
  loadVersionsAndStems,
  tabView = "overview",
}: DetailPanelContentProps) => {
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const { playTrack } = useAudioPlayer();
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [comparisonLeftId, setComparisonLeftId] = useState<string | undefined>();
  const [comparisonRightId, setComparisonRightId] = useState<string | undefined>();
  const [showMoreOpen, setShowMoreOpen] = useState(false);

  useEffect(() => {
    if (!track?.id) {
      return;
    }

    const hasView = viewSessionGuard.has(track.id);

    AnalyticsService.recordView(track.id).catch((error) => {
      import('@/utils/logger').then(({ logError }) => {
        logError('Failed to record track view', error, 'DetailPanel', {
          trackId: track.id
        });
      });
    });

    if (track.status === 'completed' && !hasView) {
      AnalyticsService.recordPlay(track.id).catch((error) => {
        import('@/utils/logger').then(({ logError }) => {
          logError('Failed to record track play', error, 'DetailPanel', {
            trackId: track.id
          });
        });
      });
    }
  }, [track?.id, track.status]);

  useEffect(() => {
    if (!versions?.length) {
      setSelectedVersionId(undefined);
      setComparisonLeftId(undefined);
      setComparisonRightId(undefined);
      return;
    }

    setSelectedVersionId((current) => {
      if (current && versions.some((version) => version.id === current)) {
        return current;
      }

      const masterVersion = versions.find((version) => version.is_master);
      return masterVersion?.id ?? versions[0].id;
    });
  }, [versions]);

  useEffect(() => {
    if (!versions?.length) {
      return;
    }

    setComparisonLeftId((current) => {
      if (current && versions.some((version) => version.id === current)) {
        return current;
      }

      const masterVersion = versions.find((version) => version.is_master);
      return masterVersion?.id ?? versions[0].id;
    });
  }, [versions]);

  useEffect(() => {
    if (!versions?.length) {
      setComparisonRightId(undefined);
      return;
    }

    setComparisonRightId((current) => {
      if (current && current !== comparisonLeftId && versions.some((version) => version.id === current)) {
        return current;
      }

      const alternative = versions.find((version) => version.id !== comparisonLeftId);
      if (alternative) {
        return alternative.id;
      }

      return versions.length > 1 ? versions[1].id : undefined;
    });
  }, [versions, comparisonLeftId]);

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId),
    [versions, selectedVersionId]
  );

  const filteredStems = useMemo(() => {
    // Если версия не выбрана, показываем только "общие" стемы (version_id === null)
    if (!selectedVersionId) {
      return stems.filter(stem => !stem.version_id);
    }

    // Если версия выбрана, показываем стемы этой версии + общие стемы
    return stems.filter(
      stem => !stem.version_id || stem.version_id === selectedVersionId
    );
  }, [stems, selectedVersionId]);

  const handleVersionSelect = useCallback((versionId: string) => {
    setSelectedVersionId(versionId);
    setComparisonLeftId(versionId);

    setComparisonRightId((current) => {
      if (current && current !== versionId && versions.some((version) => version.id === current)) {
        return current;
      }

      const alternative = versions.find((version) => version.id !== versionId);
      return alternative?.id ?? current;
    });
  }, [versions]);

  const handleComparisonLeftChange = useCallback((versionId: string) => {
    setComparisonLeftId(versionId);
    setSelectedVersionId(versionId);

    setComparisonRightId((current) => {
      if (current && current !== versionId && versions.some((version) => version.id === current)) {
        return current;
      }

      const alternative = versions.find((version) => version.id !== versionId);
      return alternative?.id ?? current;
    });
  }, [versions]);

  const handleComparisonRightChange = useCallback((versionId: string) => {
    if (versionId === comparisonLeftId) {
      const alternative = versions.find((version) => version.id !== versionId);
      if (alternative) {
        setComparisonLeftId(alternative.id);
        setSelectedVersionId(alternative.id);
      }
    }

    setComparisonRightId(versionId);
  }, [comparisonLeftId, versions]);

  const handleComparisonSwap = useCallback((leftId: string, rightId: string) => {
    setComparisonLeftId(rightId);
    setSelectedVersionId(rightId);
    setComparisonRightId(leftId);
  }, []);

  const handlePresetApply = (preset: StylePreset) => {
    const presetGenre = preset.styleIds
      .map(styleId => getStyleById(styleId)?.name ?? styleId)
      .join(", ");

    if (presetGenre) {
      setGenre(presetGenre);
    }
  };

  const handleTagsApply = (tags: string[]) => {
    if (!tags.length) {
      return;
    }

    setMood(tags.slice(0, 3).join(", "));
  };

  const createdAtToDisplay = activeVersion?.created_at ?? track.created_at;
  const durationToDisplay = activeVersion?.duration ?? track.duration_seconds;

  const extractArtist = (metadata?: Record<string, unknown> | null) => {
    if (!metadata) return undefined;
    const artistKeys = ["artist", "artist_name", "artistName", "creator", "performer"] as const;
    for (const key of artistKeys) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim().length > 0) return value;
    }
    return undefined;
  };

  const artist = extractArtist(track.metadata) ?? "Неизвестный артист";

  return (
    <TooltipProvider delayDuration={500}>
      {/* Compact Track Hero - Vertical Layout */}
      <CompactTrackHero
        track={track}
        activeVersion={activeVersion ?? null}
        artist={artist}
        isLiked={isLiked}
        likeCount={likeCount}
        onLike={toggleLike}
        onDownload={onDownload}
        onShare={onShare}
                onOpenPlayer={() => {
                  playTrack({
                    id: track.id,
                    title: track.title,
                    audio_url: track.audio_url || '',
                    cover_url: track.cover_url,
                    duration: track.duration || track.duration_seconds,
                    status: (track.status as "completed" | "failed" | "pending" | "processing") || "completed",
                    style_tags: track.style_tags || [],
                    lyrics: track.lyrics,
                  });
                }}
      />

      <div className="p-4 sm:p-6 space-y-6 lg:space-y-8">
        {/* Overview Tab Content */}
        {tabView === "overview" && (
          <>
            {/* Metadata Card */}
            <Card className="bg-[var(--card-primary-bg)] border-[var(--card-primary-border)] shadow-[var(--card-primary-shadow)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Метаданные</CardTitle>
                <CardDescription>Обновите ключевую информацию и видимость трека.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название трека"
                  className="h-10 text-sm"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    id="genre"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Жанр"
                    className="h-10 text-sm"
                  />
                  <Input
                    id="mood"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="Настроение"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-background/60 p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Публичный доступ</Label>
                    <p className="text-xs text-muted-foreground">Трек будет доступен всем пользователям.</p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
                <Button size="default" className="w-full" onClick={onSave} disabled={isSaving}>
                  {isSaving ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </CardContent>
            </Card>

            {/* Statistics Card */}
            <Card className="bg-[var(--card-secondary-bg)] border-[var(--card-secondary-border)] shadow-[var(--card-secondary-shadow)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Статистика</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <StatsItem icon={Eye} label="Просмотры" value={`${track.view_count || 0}`} />
                <StatsItem icon={Heart} label="Лайки" value={`${track.like_count || 0}`} />
                <StatsItem icon={Calendar} label="Создан" value={formatDate(createdAtToDisplay)} />
                <StatsItem icon={Clock} label="Длительность" value={formatDuration(durationToDisplay)} />
              </CardContent>
            </Card>

            {/* AI Recommendations Card */}
            <Card className="bg-[var(--card-secondary-bg)] border-[var(--card-secondary-border)] shadow-[var(--card-secondary-shadow)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">AI рекомендации по стилю</CardTitle>
                <CardDescription>Подберите подходящие жанры и теги с помощью ассистента.</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <StyleRecommendationsPanel
                  mood={mood}
                  genre={genre}
                  context={track.prompt}
                  currentTags={track.style_tags ?? []}
                  onApplyPreset={handlePresetApply}
                  onApplyTags={handleTagsApply}
                />
              </CardContent>
            </Card>

            {/* Show More Collapsible - Technical Details & Prompt */}
            <Collapsible open={showMoreOpen} onOpenChange={setShowMoreOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  {showMoreOpen ? "Скрыть детали" : "Показать больше"}
                  <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", showMoreOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Technical Details */}
                <Card className="bg-[var(--card-tertiary-bg)] border-[var(--card-tertiary-border)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Технические детали</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Модель:</span>
                      <span className="font-medium">{track.model_name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Suno ID:</span>
                      <span className="font-mono text-xs">{track.suno_id || "—"}</span>
                    </div>
                    {track.video_url && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Видео:</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => window.open(track.video_url, "_blank")}
                        >
                          Открыть
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Generation Prompt */}
                {track.prompt && (
                  <Card className="bg-[var(--card-tertiary-bg)] border-[var(--card-tertiary-border)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Промпт генерации</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap font-mono">
                        {track.prompt}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Versions Tab Content */}
        {tabView === "versions" && (
          <>
            {versions.length === 0 ? (
              <EmptyStateCard
                icon={GitBranch}
                title="Нет версий"
                description="Создайте новую версию через действия трека"
              />
            ) : (
              <>
                <Card className="border-border/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Версии трека</CardTitle>
                    <CardDescription>Переключайтесь между версиями и управляйте статусом.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TrackVersionSelector
                      versions={versions.map((version) => ({
                        id: version.id,
                        version_number: version.version_number,
                        created_at: version.created_at,
                        is_master: version.is_master,
                        is_original: version.is_original,
                      }))}
                      selectedVersionId={selectedVersionId}
                      onSelect={handleVersionSelect}
                    />
                    {versions.length >= 2 && (
                      <TrackVersionComparison
                        trackId={track.id}
                        versions={versions}
                        trackMetadata={track.metadata ?? null}
                        leftVersionId={comparisonLeftId}
                        rightVersionId={comparisonRightId}
                        onLeftVersionChange={handleComparisonLeftChange}
                        onRightVersionChange={handleComparisonRightChange}
                        onSwapSides={handleComparisonSwap}
                      />
                    )}
                    <TrackVersions
                      trackId={track.id}
                      versions={versions}
                      trackMetadata={track.metadata ?? null}
                      onVersionUpdate={loadVersionsAndStems}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* Stems Tab Content */}
        {tabView === "stems" && (
          <>
            {track.status !== 'completed' ? (
              <EmptyStateCard
                icon={Music4}
                title="Трек еще обрабатывается"
                description="Стемы станут доступны после завершения генерации"
              />
            ) : (
              <Card className="border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Стемы</CardTitle>
                  <CardDescription>Создавайте и управляйте стемами выбранной версии.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TrackStemsPanel
                    trackId={track.id}
                    versionId={selectedVersionId}
                    stems={filteredStems}
                    onStemsGenerated={loadVersionsAndStems}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Details Tab Content */}
        {tabView === "details" && (
          <>
            {/* Structured Lyrics */}
            {track.lyrics && (
              <Card className="bg-[var(--card-primary-bg)] border-[var(--card-primary-border)] shadow-[var(--card-primary-shadow)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Текст песни</CardTitle>
                  <CardDescription>Структурированный вывод секций и текста</CardDescription>
                </CardHeader>
                <CardContent>
                  <StructuredLyrics lyrics={track.lyrics} />
                </CardContent>
              </Card>
            )}

            {/* Technical Details */}
            <Card className="bg-[var(--card-tertiary-bg)] border-[var(--card-tertiary-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Технические детали</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Модель:</span>
                  <span className="font-medium">{track.model_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suno ID:</span>
                  <span className="font-mono text-xs">{track.suno_id || "—"}</span>
                </div>
                {track.video_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(track.video_url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Открыть видео
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Generation Prompt */}
            {track.prompt && (
              <Card className="bg-[var(--card-tertiary-bg)] border-[var(--card-tertiary-border)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Промпт генерации</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {track.prompt}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone Card */}
            <Card className="border border-destructive/40 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-destructive">Опасная зона</CardTitle>
                <CardDescription>Удалите трек и все связанные данные без возможности восстановления.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Удалить трек навсегда
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Удалить трек безвозвратно</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

interface StatsItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

const StatsItem = ({ icon: Icon, label, value }: StatsItemProps) => (
  <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/60 p-3">
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
    </div>
    <span className="font-medium text-sm">{value}</span>
  </div>
);
