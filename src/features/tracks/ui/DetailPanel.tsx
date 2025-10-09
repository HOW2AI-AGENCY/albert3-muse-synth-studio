import { useReducer, useEffect, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DetailPanelContent } from "@/components/workspace/DetailPanelContent";
import { TrackDeleteDialog } from "@/components/tracks/TrackDeleteDialog";
import { ApiService } from "@/services/api.service";
import type {
  DetailPanelTrack,
  DetailPanelTrackVersion,
  DetailPanelTrackStem,
} from "@/types/track";

interface DetailPanelProps {
  track: DetailPanelTrack & { created_at: string };
  onClose?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

// Определяем типы для состояния и действий
interface DetailPanelState {
  formData: {
    title: string;
    genre: string;
    mood: string;
    isPublic: boolean;
  };
  ui: {
    isSaving: boolean;
    deleteDialogOpen: boolean;
  };
  data: {
    versions: DetailPanelTrackVersion[];
    stems: DetailPanelTrackStem[];
  };
}

type DetailPanelAction =
  | { type: 'SET_FORM_FIELD'; field: keyof DetailPanelState['formData']; value: string | boolean }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_DELETE_DIALOG'; value: boolean }
  | { type: 'SET_VERSIONS'; value: DetailPanelTrackVersion[] }
  | { type: 'SET_STEMS'; value: DetailPanelTrackStem[] }
  | { type: 'RESET_FORM'; track: DetailPanelProps['track'] };

// Reducer для управления состоянием
const detailPanelReducer = (state: DetailPanelState, action: DetailPanelAction): DetailPanelState => {
  switch (action.type) {
    case 'SET_FORM_FIELD':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value,
        },
      };
    case 'SET_SAVING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isSaving: action.value,
        },
      };
    case 'SET_DELETE_DIALOG':
      return {
        ...state,
        ui: {
          ...state.ui,
          deleteDialogOpen: action.value,
        },
      };
    case 'SET_VERSIONS':
      return {
        ...state,
        data: {
          ...state.data,
          versions: action.value,
        },
      };
    case 'SET_STEMS':
      return {
        ...state,
        data: {
          ...state.data,
          stems: action.value,
        },
      };
    case 'RESET_FORM':
      return {
        ...state,
        formData: {
          title: action.track.title,
          genre: action.track.genre || "",
          mood: action.track.mood || "",
          isPublic: action.track.is_public || false,
        },
      };
    default:
      return state;
  }
};

export const DetailPanel = ({ track, onClose, onUpdate, onDelete }: DetailPanelProps) => {
  // Инициализируем состояние с помощью useMemo для оптимизации
  const initialState = useMemo((): DetailPanelState => ({
    formData: {
      title: track.title,
      genre: track.genre || "",
      mood: track.mood || "",
      isPublic: track.is_public || false,
    },
    ui: {
      isSaving: false,
      deleteDialogOpen: false,
    },
    data: {
      versions: [],
      stems: [],
    },
  }), [track.title, track.genre, track.mood, track.is_public]);

  const [state, dispatch] = useReducer(detailPanelReducer, initialState);
  const { toast } = useToast();

  // Мемоизированные обработчики для предотвращения лишних ре-рендеров
  const handleFormChange = useCallback((field: keyof DetailPanelState['formData'], value: string | boolean) => {
    dispatch({ type: 'SET_FORM_FIELD', field, value });
  }, []);

  const loadVersionsAndStems = useCallback(async () => {
    try {
      // Load versions
      const { data: versionsData } = await supabase
        .from('track_versions')
        .select('*')
        .eq('parent_track_id', track.id)
        .order('version_number');

      if (versionsData) {
        dispatch({
          type: 'SET_VERSIONS',
          value: versionsData
            .filter((version): version is typeof version & { audio_url: string } => Boolean(version?.audio_url))
            .map((version) => ({
              id: version.id as string,
              version_number: Number(version.version_number) || 0,
              is_master: Boolean(version.is_master),
              suno_id: (version.suno_id as string | null) ?? null,
              audio_url: version.audio_url as string,
              video_url: (version.video_url as string | null) ?? undefined,
              cover_url: (version.cover_url as string | null) ?? undefined,
              lyrics: (version.lyrics as string | null) ?? undefined,
              duration: (version.duration as number | null) ?? null,
              metadata: (version.metadata as Record<string, unknown> | null) ?? null,
              created_at: (version.created_at as string | null) ?? null,
            }))
        });
      }

      // Load stems
      const { data: stemsData } = await supabase
        .from('track_stems')
        .select('*')
        .eq('track_id', track.id);
      
      if (stemsData) {
        dispatch({
          type: 'SET_STEMS',
          value: stemsData.map(stem => ({
            id: stem.id as string,
            stem_type: stem.stem_type as string,
            audio_url: stem.audio_url as string,
            separation_mode: stem.separation_mode as string,
            version_id: 'version_id' in stem ? (stem as { version_id?: string | null }).version_id ?? null : undefined,
            created_at: 'created_at' in stem ? (stem as { created_at?: string | null }).created_at ?? null : undefined,
          })),
        });
      }
    } catch (error) {
      console.error('Error loading versions and stems:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные трека",
        variant: "destructive",
      });
    }
  }, [track.id, toast]);

  // Load track versions and stems
  useEffect(() => {
    loadVersionsAndStems();
  }, [loadVersionsAndStems]);

  // Сброс формы при изменении трека
  useEffect(() => {
    dispatch({ type: 'RESET_FORM', track });
  }, [track]);

  const handleSave = useCallback(async () => {
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      const { error } = await supabase
        .from("tracks")
        .update({
          title: state.formData.title,
          genre: state.formData.genre || null,
          mood: state.formData.mood || null,
          is_public: state.formData.isPublic,
        })
        .eq("id", track.id);

      if (error) throw error;

      toast({
        title: "✅ Сохранено",
        description: "Изменения успешно применены",
      });

      onUpdate?.();
    } catch (error) {
      console.error("Error updating track:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }, [state.formData, track.id, toast, onUpdate]);

  const handleDownload = useCallback(() => {
    if (track.audio_url) {
      window.open(track.audio_url, "_blank");
    }
  }, [track.audio_url]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/track/${track.id}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      toast({
        title: "🔗 Ссылка скопирована",
        description: "Поделитесь ссылкой с друзьями",
      });
    } catch (error) {
      console.error("Failed to copy share link", error);
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      });
    }
  }, [track.id, toast]);

  const handleDelete = useCallback(async () => {
    try {
      await ApiService.deleteTrackCompletely(track.id);

      toast({
        title: "🗑️ Трек удалён",
        description: "Трек и все связанные данные успешно удалены",
      });

      onDelete?.();
      onClose?.();
    } catch (error) {
      console.error("Error deleting track:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить трек",
        variant: "destructive",
      });
    }
  }, [track.id, toast, onDelete, onClose]);

  const handleDeleteDialogOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_DELETE_DIALOG', value: open });
  }, []);

  return (
    <div
      className="h-full flex flex-col bg-card border-l border-border w-full max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl"
      role="complementary"
      aria-label="Панель деталей трека"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 justify-between p-3 sm:p-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Badge
            variant={track.status === "completed" ? "default" : "secondary"}
            className="text-xs shrink-0"
          >
            {track.status === "completed" ? "✅ Готов" : "⏳ В процессе"}
          </Badge>
          <h3 className="font-semibold text-base truncate" title={track.title}>
            {track.title}
          </h3>
        </div>
        {onClose && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="shrink-0"
            aria-label="Закрыть панель деталей"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
        {/* Cover Art Preview */}
        {track.cover_url && (
          <div className="p-4">
            <div className="aspect-square max-h-32 sm:max-h-48 overflow-hidden border border-border rounded-xl shadow-lg">
              <img
                src={track.cover_url}
                alt={`Обложка трека ${track.title}`}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        )}

        <DetailPanelContent
          track={track}
          title={state.formData.title}
          setTitle={(value) => handleFormChange('title', value)}
          genre={state.formData.genre}
          setGenre={(value) => handleFormChange('genre', value)}
          mood={state.formData.mood}
          setMood={(value) => handleFormChange('mood', value)}
          isPublic={state.formData.isPublic}
          setIsPublic={(value) => handleFormChange('isPublic', value)}
          isSaving={state.ui.isSaving}
          versions={state.data.versions}
          stems={state.data.stems}
          onSave={handleSave}
          onDownload={handleDownload}
          onShare={handleShare}
          onDelete={() => handleDeleteDialogOpen(true)}
          loadVersionsAndStems={loadVersionsAndStems}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <TrackDeleteDialog
        open={state.ui.deleteDialogOpen}
        onOpenChange={handleDeleteDialogOpen}
        trackId={track.id}
        trackTitle={track.title}
        onConfirm={handleDelete}
      />
    </div>
  );
};
