import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Share2,
  Trash2,
  Eye,
  Heart,
  Calendar,
  Clock,
  ExternalLink,
  Play,
  CalendarClock,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackVersions, TrackStemsPanel, useTrackLike } from "@/features/tracks";
import { TrackDetailsPanel } from "@/features/tracks/ui/TrackDetailsPanel";
import { TrackVersionSelector } from "@/features/tracks/ui/TrackVersionSelector";
import { cn } from "@/lib/utils";
import { StyleRecommendationsPanel } from "./StyleRecommendationsPanel";
import type { StylePreset } from "@/types/styles";
import { getStyleById } from "@/data/music-styles";
import { AnalyticsService, viewSessionGuard } from "@/services/analytics.service";
import type {
  DetailPanelTrack,
  DetailPanelTrackVersion,
  DetailPanelTrackStem,
} from "@/types/track";

interface DetailPanelContentProps {
  track: DetailPanelTrack;
  title: string;
  setTitle: (value: string) => void;
  genre: string;
  setGenre: (value: string) => void;
  mood: string;
  setMood: (value: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  isSaving: boolean;
  versions: DetailPanelTrackVersion[];
  stems: DetailPanelTrackStem[];
  onSave: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  loadVersionsAndStems: () => void;
}

const formatDate = (date?: string | null) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    console.error("Failed to format date", error);
    return "—";
  }
};

const formatDuration = (seconds?: number | null) => {
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
}: DetailPanelContentProps) => {
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count ?? 0);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();

  useEffect(() => {
    if (!track?.id) {
      return;
    }

    const hasView = viewSessionGuard.has(track.id);

    AnalyticsService.recordView(track.id).catch((error) => {
      console.error("Failed to record track view", error);
    });

    if (track.status === "completed" && !hasView) {
      AnalyticsService.recordPlay(track.id).catch((error) => {
        console.error("Failed to record track play", error);
      });
    }
  }, [track?.id, track.status]);

  useEffect(() => {
    if (!versions?.length) {
      setSelectedVersionId(undefined);
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

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) ?? null,
    [versions, selectedVersionId]
  );

  const filteredStems = useMemo(() => {
    if (!selectedVersionId) {
      return stems;
    }

    return stems.filter((stem) => !stem.version_id || stem.version_id === selectedVersionId);
  }, [stems, selectedVersionId]);

  const versionOptions = useMemo(
    () =>
      versions.map((version) => ({
        id: version.id,
        version_number: version.version_number,
        created_at: version.created_at,
        is_master: Boolean(version.is_master),
      })),
    [versions]
  );

  const handlePresetApply = (preset: StylePreset) => {
    const presetGenre = preset.styleIds
      .map((styleId) => getStyleById(styleId)?.name ?? styleId)
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

  const createdAtToDisplay = activeVersion?.created_at ?? track.created_at ?? null;
  const durationToDisplay = activeVersion?.duration ?? track.duration_seconds ?? track.duration ?? null;
  const shouldRenderStemsCard = Boolean(track.audio_url) || filteredStems.length > 0;
  const hasGenerationDetails = Boolean(track.suno_id || track.model_name || track.lyrics || track.video_url);

  return (
    <TooltipProvider delayDuration={500}>
      <div className="space-y-6 p-4 sm:space-y-7 sm:p-6">
        <ActionToolbar
          isLiked={isLiked}
          likeCount={likeCount}
          onToggleLike={toggleLike}
          onDownload={onDownload}
          onShare={onShare}
          hasAudio={Boolean(track.audio_url)}
        />

        <TrackDetailsPanel track={track} activeVersion={activeVersion} />

        <div className="grid gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <MetadataCard
              title={title}
              genre={genre}
              mood={mood}
              isPublic={isPublic}
              onTitleChange={setTitle}
              onGenreChange={setGenre}
              onMoodChange={setMood}
              onVisibilityChange={setIsPublic}
              onSave={onSave}
              isSaving={isSaving}
            />

            <RecommendationsCard
              mood={mood}
              genre={genre}
              prompt={track.prompt ?? ""}
              styleTags={track.style_tags ?? []}
              onApplyPreset={handlePresetApply}
              onApplyTags={handleTagsApply}
            />

            <DangerZoneCard onDelete={onDelete} />
          </div>

          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <VersionsCard
              trackId={track.id}
              versions={versions}
              options={versionOptions}
              selectedVersionId={selectedVersionId}
              onSelectVersion={setSelectedVersionId}
              onVersionUpdate={loadVersionsAndStems}
            />

            {shouldRenderStemsCard && (
              <StemsCard
                trackId={track.id}
                versionId={selectedVersionId}
                stems={filteredStems}
                onStemsGenerated={loadVersionsAndStems}
              />
            )}

            <StatsCard
              views={track.view_count || 0}
              likes={track.like_count || 0}
              createdAt={formatDate(createdAtToDisplay)}
              duration={formatDuration(durationToDisplay)}
            />

            <PromptCard prompt={track.prompt ?? "—"} />

            {hasGenerationDetails && (
              <GenerationDetailsCard
                modelName={track.model_name}
                sunoId={track.suno_id}
                videoUrl={track.video_url}
                lyrics={track.lyrics}
              />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

interface ActionToolbarProps {
  isLiked: boolean;
  likeCount: number;
  hasAudio: boolean;
  onToggleLike: () => void;
  onDownload: () => void;
  onShare: () => void;
}

const ActionToolbar = ({ isLiked, likeCount, hasAudio, onToggleLike, onDownload, onShare }: ActionToolbarProps) => (
  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", isLiked && "text-red-500")}
          onClick={onToggleLike}
        >
          <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
          {likeCount > 0 && (
            <Badge className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center p-0 text-[10px]">
              {likeCount}
            </Badge>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Избранное</TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onDownload} disabled={!hasAudio}>
          <Download className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Скачать MP3</TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onShare}>
          <Share2 className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Поделиться</TooltipContent>
    </Tooltip>
  </div>
);

interface MetadataCardProps {
  title: string;
  genre: string;
  mood: string;
  isPublic: boolean;
  isSaving: boolean;
  onTitleChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onMoodChange: (value: string) => void;
  onVisibilityChange: (value: boolean) => void;
  onSave: () => void;
}

const MetadataCard = ({
  title,
  genre,
  mood,
  isPublic,
  isSaving,
  onTitleChange,
  onGenreChange,
  onMoodChange,
  onVisibilityChange,
  onSave,
}: MetadataCardProps) => (
  <Card className="border-border/70">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Метаданные</CardTitle>
      <CardDescription>Обновите ключевую информацию и видимость трека.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <Input
        id="title"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Название трека"
        className="h-10 text-sm"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id="genre"
          value={genre}
          onChange={(event) => onGenreChange(event.target.value)}
          placeholder="Жанр"
          className="h-10 text-sm"
        />

        <Input
          id="mood"
          value={mood}
          onChange={(event) => onMoodChange(event.target.value)}
          placeholder="Настроение"
          className="h-10 text-sm"
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-background/60 p-3">
        <div className="space-y-0.5">
          <Label className="text-sm">Публичный доступ</Label>
          <p className="text-xs text-muted-foreground">Трек будет доступен всем пользователям.</p>
        </div>
        <Switch checked={isPublic} onCheckedChange={onVisibilityChange} />
      </div>

      <Button size="default" className="w-full" onClick={onSave} disabled={isSaving}>
        {isSaving ? "Сохранение..." : "Сохранить изменения"}
      </Button>
    </CardContent>
  </Card>
);

interface RecommendationsCardProps {
  mood: string;
  genre: string;
  prompt: string;
  styleTags: string[];
  onApplyPreset: (preset: StylePreset) => void;
  onApplyTags: (tags: string[]) => void;
}

const RecommendationsCard = ({ mood, genre, prompt, styleTags, onApplyPreset, onApplyTags }: RecommendationsCardProps) => (
  <Card className="border-border/70">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">AI рекомендации по стилю</CardTitle>
      <CardDescription>Подберите подходящие жанры и теги с помощью ассистента.</CardDescription>
    </CardHeader>
    <CardContent className="pb-4">
      <StyleRecommendationsPanel
        mood={mood}
        genre={genre}
        context={prompt}
        currentTags={styleTags}
        onApplyPreset={onApplyPreset}
        onApplyTags={onApplyTags}
      />
    </CardContent>
  </Card>
);

const DangerZoneCard = ({ onDelete }: { onDelete: () => void }) => (
  <Card className="border border-destructive/40 bg-destructive/5">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg text-destructive">Опасная зона</CardTitle>
      <CardDescription>Удалите трек и все связанные данные без возможности восстановления.</CardDescription>
    </CardHeader>
    <CardContent>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Удалить трек
          </Button>
        </TooltipTrigger>
        <TooltipContent>Удалить трек безвозвратно</TooltipContent>
      </Tooltip>
    </CardContent>
  </Card>
);

interface VersionsCardProps {
  trackId: string;
  versions: DetailPanelTrackVersion[];
  options: Array<{
    id: string;
    version_number: number;
    created_at?: string | null;
    is_master?: boolean;
  }>;
  selectedVersionId?: string;
  onSelectVersion: (versionId: string) => void;
  onVersionUpdate: () => void;
}

const VersionsCard = ({
  trackId,
  versions,
  options,
  selectedVersionId,
  onSelectVersion,
  onVersionUpdate,
}: VersionsCardProps) => (
  <Card className="border-border/70">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Версии трека</CardTitle>
      <CardDescription>Переключайтесь между версиями и управляйте статусом.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <span>Выбрать версию</span>
          {options.some((version) => version.is_master) && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Star className="h-3 w-3" />
              Главная
            </Badge>
          )}
        </div>
        <TrackVersionSelector
          versions={options}
          selectedVersionId={selectedVersionId}
          onSelect={onSelectVersion}
        />
      </div>
      <TrackVersions trackId={trackId} versions={versions} onVersionUpdate={onVersionUpdate} />
    </CardContent>
  </Card>
);

interface StemsCardProps {
  trackId: string;
  versionId?: string;
  stems: DetailPanelTrackStem[];
  onStemsGenerated: () => void;
}

const StemsCard = ({ trackId, versionId, stems, onStemsGenerated }: StemsCardProps) => (
  <Card className="border-border/70">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Стемы</CardTitle>
      <CardDescription>Создавайте и управляйте стемами выбранной версии.</CardDescription>
    </CardHeader>
    <CardContent>
      <TrackStemsPanel
        trackId={trackId}
        versionId={versionId}
        stems={stems}
        onStemsGenerated={onStemsGenerated}
      />
    </CardContent>
  </Card>
);

interface StatsCardProps {
  views: number;
  likes: number;
  createdAt: string;
  duration: string;
}

const StatsCard = ({ views, likes, createdAt, duration }: StatsCardProps) => (
  <Card className="border-border/70">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Статистика</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-3 sm:grid-cols-2">
      <StatsItem icon={Eye} label="Просмотры" value={`${views}`} />
      <StatsItem icon={Heart} label="Лайки" value={`${likes}`} />
      <StatsItem icon={Calendar} label="Создан" value={createdAt} />
      <StatsItem icon={Clock} label="Длительность" value={duration} />
    </CardContent>
  </Card>
);

const PromptCard = ({ prompt }: { prompt: string }) => (
  <Card className="border-border/70">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Промпт</CardTitle>
      <CardDescription>Исходный запрос, использованный при генерации трека.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
        {prompt}
      </div>
    </CardContent>
  </Card>
);

interface GenerationDetailsCardProps {
  modelName?: string | null;
  sunoId?: string | null;
  videoUrl?: string | null;
  lyrics?: string | null;
}

const GenerationDetailsCard = ({ modelName, sunoId, videoUrl, lyrics }: GenerationDetailsCardProps) => (
  <Card className="border-border/70">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Детали генерации</CardTitle>
      <CardDescription>Дополнительные сведения о создании трека.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4 text-sm text-muted-foreground">
      {(modelName || sunoId) && (
        <div className="space-y-2">
          {modelName && <p>Модель: {modelName}</p>}
          {sunoId && <p className="font-mono text-xs">ID: {sunoId}</p>}

          {sunoId && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-start text-sm"
              onClick={() => window.open(`https://suno.com/song/${sunoId}`, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Открыть в Suno
            </Button>
          )}

          {videoUrl && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-start text-sm"
              onClick={() => window.open(videoUrl, "_blank")}
            >
              <Play className="mr-2 h-4 w-4" />
              Видео
            </Button>
          )}
        </div>
      )}

      {lyrics && (
        <div className="space-y-2">
          <Label className="text-sm">Текст</Label>
          <Textarea value={lyrics} readOnly className="min-h-[120px] resize-none text-sm" />
        </div>
      )}
    </CardContent>
  </Card>
);

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
    <span className="text-sm font-medium">{value}</span>
  </div>
);

