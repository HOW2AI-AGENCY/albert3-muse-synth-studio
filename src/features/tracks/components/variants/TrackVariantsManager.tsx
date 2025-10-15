import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Music2, ChevronDown, ChevronUp } from '@/utils/iconImports';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { buildAudioPlayerTrack } from '../trackVersionUtils';
import { useVariantState } from './hooks/useVariantState';
import { useVariantActions } from './hooks/useVariantActions';
import { VariantCard } from './VariantCard';
import { VariantDeleteDialog } from './VariantDeleteDialog';
import type { TrackVariant, VariantActionHandlers } from '@/features/tracks/types/variant';

interface TrackVariantsManagerProps {
  trackId: string;
  variants: TrackVariant[];
  onUpdate?: () => void;
  onExtend?: (trackId: string, variantId: string) => void;
  onCover?: (trackId: string, variantId: string) => void;
  onSeparateStems?: (trackId: string, variantId: string) => void;
  onSetAsReference?: (variantId: string) => void;
}

const TrackVariantsManagerComponent = ({
  trackId,
  variants,
  onUpdate,
  onExtend,
  onCover,
  onSeparateStems,
  onSetAsReference,
}: TrackVariantsManagerProps) => {
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const { vibrate } = useHapticFeedback();
  
  const {
    isExpanded,
    toggleExpanded,
    deleteDialogOpen,
    variantToDelete,
    openDeleteDialog,
    closeDeleteDialog,
  } = useVariantState();

  const { handleSetPreferred, handleDelete } = useVariantActions({
    trackId,
    variants,
    onUpdate,
  });

  const handlePlayVariant = useCallback((variant: TrackVariant) => {
    vibrate('light');
    const isCurrentVariant = currentTrack?.id === variant.id;

    if (isCurrentVariant && isPlaying) {
      togglePlayPause();
    } else {
      // Convert TrackVariant to legacy format for player
      const legacyVersion = {
        id: variant.id,
        version_number: variant.variantIndex,
        is_master: variant.isPreferredVariant,
        is_original: variant.isPrimaryVariant,
        source_version_number: variant.sourceVariantIndex,
        audio_url: variant.audio_url || '',
        cover_url: variant.cover_url,
        duration: variant.duration,
        lyrics: variant.lyrics,
        metadata: variant.metadata,
      };
      playTrack(buildAudioPlayerTrack(legacyVersion, trackId));
    }
  }, [trackId, currentTrack, isPlaying, vibrate, togglePlayPause, playTrack]);

  const handleConfirmDelete = useCallback(async () => {
    if (!variantToDelete) return;
    const success = await handleDelete(variantToDelete);
    if (success) {
      closeDeleteDialog();
    }
  }, [variantToDelete, handleDelete, closeDeleteDialog]);

  const additionalVariants = variants.filter(v => !v.isPrimaryVariant);
  const additionalCount = additionalVariants.length;

  if (!variants || variants.length <= 1) {
    return null;
  }

  const handlers: VariantActionHandlers = {
    onPlay: handlePlayVariant,
    onSetPreferred: handleSetPreferred,
    onExtend,
    onCover,
    onSeparateStems,
    onSetAsReference,
    onDelete: openDeleteDialog,
  };

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Версии ({additionalCount})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            vibrate('light');
            toggleExpanded();
          }}
          className="h-8"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-2 animate-fade-in">
          {variants.map(variant => {
            const isCurrentVariant = currentTrack?.id === variant.id;
            const isVariantPlaying = isCurrentVariant && isPlaying;

            return (
              <VariantCard
                key={variant.id}
                variant={variant}
                isPlaying={isVariantPlaying}
                isCurrentVariant={isCurrentVariant}
                showDeleteButton={additionalCount > 1}
                handlers={handlers}
              />
            );
          })}
        </div>
      )}

      <VariantDeleteDialog
        open={deleteDialogOpen}
        variant={variantToDelete}
        onOpenChange={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export const TrackVariantsManager = memo(TrackVariantsManagerComponent);
