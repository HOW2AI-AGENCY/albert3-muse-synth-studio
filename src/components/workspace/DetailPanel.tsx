import { useReducer, useEffect, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DetailPanelContent } from "./DetailPanelContent";
import { TrackDeleteDialog } from "@/components/tracks/TrackDeleteDialog";
import { ApiService } from "@/services/api.service";

interface TrackVersion {
  id: string;
  version_number: number;
  is_master: boolean;
  suno_id: string;
  audio_url: string;
  video_url?: string;
  cover_url?: string;
  lyrics?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
}

interface DetailPanelProps {
  track: {
    id: string;
    title: string;
    prompt: string;
    status: string;
    audio_url?: string;
    cover_url?: string;
    video_url?: string;
    suno_id?: string;
    model_name?: string;
    lyrics?: string;
    style_tags?: string[];
    genre?: string;
    mood?: string;
    is_public?: boolean;
    view_count?: number;
    like_count?: number;
    created_at: string;
    duration_seconds?: number;
    has_stems?: boolean;
  };
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
    versions: TrackVersion[];
    stems: TrackStem[];
  };
}

type DetailPanelAction =
  | { type: 'SET_FORM_FIELD'; field: keyof DetailPanelState['formData']; value: string | boolean }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_DELETE_DIALOG'; value: boolean }
  | { type: 'SET_VERSIONS'; value: TrackVersion[] }
  | { type: 'SET_STEMS'; value: TrackStem[] }
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
          value: versionsData.map(v => ({
            ...v,
            metadata: v.metadata as Record<string, unknown>
          }))
        });
      }

      // Load stems
      const { data: stemsData } = await supabase
        .from('track_stems')
        .select('*')
        .eq('track_id', track.id);
      
      if (stemsData) {
        dispatch({ type: 'SET_STEMS', value: stemsData });
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
  }, [track.id, track.title, track.genre, track.mood, track.is_public]);

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

  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}/track/${track.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "🔗 Ссылка скопирована",
      description: "Поделитесь ссылкой с друзьями",
    });
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
    <div className="h-full flex flex-col bg-card border-l border-border" role="complementary" aria-label="Панель деталей трека">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Детали</h3>
        {onClose && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={onClose}
            aria-label="Закрыть панель деталей"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Cover Art Preview - Compact */}
        <div className="aspect-square max-h-64 overflow-hidden border-b border-border">
          {track.cover_url ? (
            <img
              src={track.cover_url}
              alt={`Обложка трека ${track.title}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
              <div className="text-center space-y-1">
                <div className="text-4xl" role="img" aria-label="Музыкальная нота">🎵</div>
                <Badge 
                  variant={track.status === "completed" ? "default" : "secondary"} 
                  className="text-xs"
                  aria-label={`Статус трека: ${track.status}`}
                >
                  {track.status}
                </Badge>
              </div>
            </div>
          )}
        </div>

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
