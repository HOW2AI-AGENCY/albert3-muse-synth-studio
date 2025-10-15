import { useCallback } from 'react';
import { toast } from 'sonner';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { logError } from '@/utils/logger';
import { updateTrackVersion, deleteTrackVersion } from '@/features/tracks/api/trackVersions';
import type { TrackVariant } from '@/features/tracks/types/variant';

export interface UseVariantActionsParams {
  trackId: string;
  variants: TrackVariant[];
  onUpdate?: () => void;
}

export interface UseVariantActionsReturn {
  handleSetPreferred: (variantId: string, isPrimary?: boolean) => Promise<void>;
  handleDelete: (variant: TrackVariant) => Promise<boolean>;
}

export const useVariantActions = ({
  trackId,
  variants,
  onUpdate,
}: UseVariantActionsParams): UseVariantActionsReturn => {
  const { vibrate } = useHapticFeedback();

  const handleSetPreferred = useCallback(async (variantId: string, isPrimary?: boolean) => {
    if (isPrimary) {
      toast.info('Первичный вариант нельзя назначить напрямую.');
      return;
    }

    try {
      vibrate('medium');

      // Unset all other preferred variants
      await Promise.all(
        variants
          .filter(v => v.id !== variantId && v.isPreferredVariant)
          .map(async v => {
            const result = await updateTrackVersion(v.id, { is_preferred_variant: false });
            if (!result.ok) throw result.error;
          })
      );

      // Set new preferred
      const result = await updateTrackVersion(variantId, { is_preferred_variant: true });
      if (!result.ok) throw result.error;

      vibrate('success');
      toast.success('Предпочтительный вариант установлен');
      onUpdate?.();
    } catch (error) {
      logError('Ошибка установки предпочтительного варианта', error as Error, 'useVariantActions', {
        trackId,
        variantId,
      });
      vibrate('error');
      toast.error('Не удалось установить предпочтительный вариант');
    }
  }, [trackId, variants, vibrate, onUpdate]);

  const handleDelete = useCallback(async (variant: TrackVariant): Promise<boolean> => {
    if (variant.isPrimaryVariant) {
      toast.error('Невозможно удалить первичный вариант');
      return false;
    }

    const nonPrimaryVariants = variants.filter(v => !v.isPrimaryVariant);
    if (nonPrimaryVariants.length === 1) {
      toast.error('Невозможно удалить единственный вариант');
      return false;
    }

    try {
      vibrate('warning');

      // If deleting preferred variant, reassign
      if (variant.isPreferredVariant && variants.length > 1) {
        const nextVariant = variants.find(v => v.id !== variant.id && !v.isPrimaryVariant);
        if (nextVariant) {
          const result = await updateTrackVersion(nextVariant.id, { is_preferred_variant: true });
          if (!result.ok) throw result.error;
        }
      }

      const result = await deleteTrackVersion(variant.id);
      if (!result.ok) throw result.error;

      vibrate('success');
      toast.success('Вариант удален');
      onUpdate?.();
      return true;
    } catch (error) {
      logError('Ошибка удаления варианта', error as Error, 'useVariantActions', {
        trackId,
        variantId: variant.id,
      });
      vibrate('error');
      toast.error('Не удалось удалить вариант');
      return false;
    }
  }, [trackId, variants, vibrate, onUpdate]);

  return {
    handleSetPreferred,
    handleDelete,
  };
};
