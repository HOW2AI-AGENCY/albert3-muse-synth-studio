import { memo, useMemo } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeArray = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return value.map(item => `${item}`).join(", ");
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const formatBpm = (value: unknown): string | undefined => {
  const bpm = toNumber(value);
  if (bpm === null) return undefined;
  return `${Math.round(bpm)} BPM`;
};

const formatLoudness = (value: unknown): string | undefined => {
  const loudness = toNumber(value);
  if (loudness === null) return undefined;
  return `${loudness.toFixed(1)} LUFS`;
};

const formatDb = (value: unknown): string | undefined => {
  const num = toNumber(value);
  if (num === null) return undefined;
  return `${num.toFixed(1)} дБ`;
};

const formatPercent = (value: unknown): string | undefined => {
  const num = toNumber(value);
  if (num === null) return undefined;
  if (num <= 1) {
    return `${Math.round(num * 100)}%`;
  }
  if (num <= 100) {
    return `${Math.round(num)}%`;
  }
  return `${num}`;
};

const formatDurationSeconds = (value: unknown): string | undefined => {
  const seconds = toNumber(value);
  if (seconds === null) return undefined;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatBoolean = (value: unknown): string | undefined => {
  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }
  if (typeof value === "string") {
    if (["true", "yes", "1"].includes(value.toLowerCase())) {
      return "Да";
    }
    if (["false", "no", "0"].includes(value.toLowerCase())) {
      return "Нет";
    }
  }
  return undefined;
};

const getValueFromPath = (source: Record<string, unknown> | undefined, path: string): unknown => {
  if (!source) return undefined;
  return path.split(".").reduce<unknown>((acc, segment) => {
    if (!isRecord(acc)) {
      return undefined;
    }
    return acc[segment];
  }, source);
};

interface MetadataFieldConfig {
  keys: string[];
  label: string;
  tooltip?: string;
  format?: (value: unknown) => string | undefined;
  monospace?: boolean;
  multiline?: boolean;
}

interface MetadataItem {
  label: string;
  tooltip?: string;
  value: string;
  monospace?: boolean;
  multiline?: boolean;
}

const AUDIO_FIELDS: MetadataFieldConfig[] = [
  {
    keys: ["audio_characteristics.tempo", "tempo", "bpm", "audio_info.tempo", "audio_summary.tempo"],
    label: "Темп",
    tooltip: "Скорость композиции в ударах в минуту.",
    format: formatBpm,
  },
  {
    keys: ["audio_characteristics.key", "key", "musical_key", "audio_info.key", "audio_summary.key"],
    label: "Тональность",
    tooltip: "Основная тональность произведения.",
  },
  {
    keys: ["audio_characteristics.scale", "scale", "mode", "audio_info.scale"],
    label: "Лад",
    tooltip: "Характер лада (мажор, минор и т.д.).",
  },
  {
    keys: ["audio_characteristics.time_signature", "time_signature", "meter", "audio_info.time_signature"],
    label: "Размер",
    tooltip: "Доля и размер композиции.",
  },
  {
    keys: ["audio_characteristics.loudness", "loudness", "lufs", "audio_analysis.loudness", "audio_info.loudness"],
    label: "Громкость",
    tooltip: "Средний уровень громкости микса в LUFS.",
    format: formatLoudness,
  },
  {
    keys: ["audio_characteristics.dynamic_range", "dynamic_range", "audio_analysis.dynamic_range"],
    label: "Дин. диапазон",
    tooltip: "Разница между тихими и громкими участками.",
    format: formatDb,
  },
  {
    keys: ["audio_characteristics.energy", "energy", "audio_summary.energy"],
    label: "Энергия",
    tooltip: "Общая энергичность и плотность звучания.",
    format: formatPercent,
  },
  {
    keys: ["audio_characteristics.danceability", "danceability", "audio_summary.danceability"],
    label: "Танцевальность",
    tooltip: "Оценка ритмичности и пригодности для танца.",
    format: formatPercent,
  },
];

const GENERATION_FIELDS: MetadataFieldConfig[] = [
  {
    keys: ["generation_parameters.prompt", "prompt", "suno_track_data.prompt", "metadata.prompt"],
    label: "Промпт",
    tooltip: "Текстовый запрос, использованный при генерации.",
    multiline: true,
  },
  {
    keys: ["generation_parameters.style", "style", "style_tags", "metadata.tags", "metadata.style"],
    label: "Стили",
    tooltip: "Жанровые и стилевые подсказки.",
    format: normalizeArray,
  },
  {
    keys: ["generation_parameters.model", "model", "model_name", "suno_track_data.model_name", "metadata.model"],
    label: "Модель",
    tooltip: "Модель Suno, выполнившая генерацию.",
  },
  {
    keys: ["generation_parameters.seed", "seed", "metadata.seed"],
    label: "Seed",
    tooltip: "Начальное значение генератора случайности.",
    monospace: true,
  },
  {
    keys: ["generation_parameters.duration", "duration", "duration_seconds", "metadata.duration"],
    label: "Длительность",
    tooltip: "Запрошенная длительность результата.",
    format: formatDurationSeconds,
  },
  {
    keys: ["generation_parameters.instrumental", "instrumental", "metadata.instrumental"],
    label: "Инструментал",
    tooltip: "Была ли запрошена версия без вокала.",
    format: formatBoolean,
  },
  {
    keys: ["generation_parameters.language", "language", "lyrics_language", "metadata.language"],
    label: "Язык",
    tooltip: "Язык текста или вокала.",
  },
  {
    keys: ["generation_parameters.guidance", "guidance", "cfg_scale", "generation_parameters.creativity", "creativity"],
    label: "Креативность",
    tooltip: "Отклонение от исходного промпта при генерации.",
    format: formatPercent,
  },
];

const QUALITY_FIELDS: MetadataFieldConfig[] = [
  {
    keys: ["quality_metrics.overall_score", "overall_score", "quality_score", "quality.overall", "quality_scores.overall"],
    label: "Общий рейтинг",
    tooltip: "Интегральная оценка качества трека.",
    format: formatPercent,
  },
  {
    keys: ["quality_metrics.coherence", "coherence", "quality.coherence", "quality_scores.coherence"],
    label: "Связность",
    tooltip: "Насколько последовательным воспринимается трек.",
    format: formatPercent,
  },
  {
    keys: ["quality_metrics.rhythm", "rhythm", "quality.rhythm", "quality_scores.rhythm"],
    label: "Ритм",
    tooltip: "Точность и стабильность ритма.",
    format: formatPercent,
  },
  {
    keys: ["quality_metrics.melody", "melody", "quality.melody", "quality_scores.melody"],
    label: "Мелодия",
    tooltip: "Развитие и выразительность мелодии.",
    format: formatPercent,
  },
  {
    keys: ["quality_metrics.mix", "mix", "quality.mix", "quality_scores.mix"],
    label: "Сведение",
    tooltip: "Баланс и чистота итогового микса.",
    format: formatPercent,
  },
  {
    keys: ["quality_metrics.vocals", "vocals", "quality.vocals", "quality_scores.vocals"],
    label: "Вокал",
    tooltip: "Качество вокальной партии.",
    format: formatPercent,
  },
  {
    keys: ["quality_metrics.instrumentation", "instrumentation", "quality.instrumentation", "quality_scores.instrumentation"],
    label: "Инструменты",
    tooltip: "Насколько богат и сбалансирован инструментальный ряд.",
    format: formatPercent,
  },
];

export interface TrackVersionMetadata {
  audio_characteristics?: Record<string, unknown>;
  generation_parameters?: Record<string, unknown>;
  quality_metrics?: Record<string, unknown>;
  suno_track_data?: Record<string, unknown> & {
    audio_info?: Record<string, unknown>;
    audio_summary?: Record<string, unknown>;
    audio_analysis?: Record<string, unknown>;
    quality?: Record<string, unknown>;
    quality_scores?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

interface TrackVersionMetadataPanelProps {
  metadata?: TrackVersionMetadata | null;
  fallbackMetadata?: TrackVersionMetadata | null;
  className?: string;
}

interface MetadataBuckets {
  audio: Record<string, unknown>[];
  generation: Record<string, unknown>[];
  quality: Record<string, unknown>[];
}

const collectBuckets = (metadata?: TrackVersionMetadata | null): MetadataBuckets => {
  if (!metadata || !isRecord(metadata)) {
    return { audio: [], generation: [], quality: [] };
  }

  const root = metadata as Record<string, unknown>;
  const sunoData = isRecord(metadata.suno_track_data) ? metadata.suno_track_data : undefined;
  const audioBuckets: Record<string, unknown>[] = [];
  const generationBuckets: Record<string, unknown>[] = [];
  const qualityBuckets: Record<string, unknown>[] = [];

  if (isRecord(metadata.audio_characteristics)) {
    audioBuckets.push(metadata.audio_characteristics);
  }
  if (sunoData) {
    if (isRecord(sunoData.audio_info)) audioBuckets.push(sunoData.audio_info);
    if (isRecord(sunoData.audio_summary)) audioBuckets.push(sunoData.audio_summary);
    if (isRecord(sunoData.audio_analysis)) audioBuckets.push(sunoData.audio_analysis);
  }
  audioBuckets.push(root);

  if (isRecord(metadata.generation_parameters)) {
    generationBuckets.push(metadata.generation_parameters);
  }
  if (sunoData) {
    if (isRecord(sunoData.metadata)) generationBuckets.push(sunoData.metadata);
  }
  generationBuckets.push(root);

  if (isRecord(metadata.quality_metrics)) {
    qualityBuckets.push(metadata.quality_metrics);
  }
  if (sunoData) {
    if (isRecord(sunoData.quality)) qualityBuckets.push(sunoData.quality);
    if (isRecord(sunoData.quality_scores)) qualityBuckets.push(sunoData.quality_scores);
  }
  qualityBuckets.push(root);

  return {
    audio: audioBuckets,
    generation: generationBuckets,
    quality: qualityBuckets,
  };
};

const pickField = (config: MetadataFieldConfig, sources: Record<string, unknown>[]): MetadataItem | null => {
  for (const key of config.keys) {
    for (const source of sources) {
      const value = getValueFromPath(source, key);
      if (value === undefined || value === null || value === "") {
        continue;
      }
      const formatted = config.format ? config.format(value) : Array.isArray(value) ? normalizeArray(value) : `${value}`;
      if (!formatted) {
        continue;
      }
      return {
        label: config.label,
        tooltip: config.tooltip,
        value: formatted,
        monospace: config.monospace,
        multiline: config.multiline,
      };
    }
  }
  return null;
};

const buildSection = (fields: MetadataFieldConfig[], sources: Record<string, unknown>[]): MetadataItem[] => {
  const items: MetadataItem[] = [];
  for (const field of fields) {
    const item = pickField(field, sources);
    if (item) {
      items.push(item);
    }
  }
  return items;
};

const MetadataSection = ({ title, items }: { title: string; items: MetadataItem[] }) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <h4 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="space-y-1">
            <div className="flex items-center gap-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <span>{item.label}</span>
              {item.tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[0.6rem] text-muted-foreground/90">
                      <Info className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    {item.tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div
              className={cn(
                "text-xs font-medium text-foreground",
                item.monospace && "font-mono",
                item.multiline ? "whitespace-pre-wrap break-words text-muted-foreground" : "text-foreground"
              )}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TrackVersionMetadataPanelComponent = ({ metadata, fallbackMetadata, className }: TrackVersionMetadataPanelProps) => {
  const { audioItems, generationItems, qualityItems } = useMemo(() => {
    const versionBuckets = collectBuckets(metadata);
    const fallbackBuckets = collectBuckets(fallbackMetadata);

    const mergeBuckets = (primary: Record<string, unknown>[], fallback: Record<string, unknown>[]) => [
      ...primary,
      ...fallback.filter(bucket => !primary.includes(bucket)),
    ];

    const audioSources = mergeBuckets(versionBuckets.audio, fallbackBuckets.audio);
    const generationSources = mergeBuckets(versionBuckets.generation, fallbackBuckets.generation);
    const qualitySources = mergeBuckets(versionBuckets.quality, fallbackBuckets.quality);

    return {
      audioItems: buildSection(AUDIO_FIELDS, audioSources),
      generationItems: buildSection(GENERATION_FIELDS, generationSources),
      qualityItems: buildSection(QUALITY_FIELDS, qualitySources),
    };
  }, [metadata, fallbackMetadata]);

  const hasContent = audioItems.length || generationItems.length || qualityItems.length;

  if (!hasContent) {
    return null;
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      <MetadataSection title="Аудио" items={audioItems} />
      <MetadataSection title="Параметры" items={generationItems} />
      <MetadataSection title="Качество" items={qualityItems} />
    </div>
  );
};

export const TrackVersionMetadataPanel = memo(TrackVersionMetadataPanelComponent);
