import { memo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getVersionLabel } from '@/utils/versionLabels';
import type { TrackVariant } from '@/features/tracks/types/variant';

interface VariantDeleteDialogProps {
  open: boolean;
  variant: TrackVariant | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const VariantDeleteDialogComponent = ({
  open,
  variant,
  onOpenChange,
  onConfirm,
}: VariantDeleteDialogProps) => {
  if (!variant) return null;

  const variantLabel = getVersionLabel({
    versionNumber: variant.variantIndex,
    isOriginal: variant.isPrimaryVariant,
    isMaster: variant.isPreferredVariant,
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить вариант?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы собираетесь удалить {variantLabel}.
            {variant.isPreferredVariant && !variant.isPrimaryVariant && (
              <span className="block mt-2 text-orange-500 font-medium">
                ⚠️ Это предпочтительный вариант. Статус будет присвоен другому варианту.
              </span>
            )}
            <span className="block mt-2">
              Это действие нельзя отменить.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const VariantDeleteDialog = memo(VariantDeleteDialogComponent);
