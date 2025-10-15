import { memo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  ArrowRight, 
  Music2, 
  Scissors, 
  FileAudio 
} from '@/utils/iconImports';
import type { TrackVariant } from '@/features/tracks/types/variant';

interface VariantActionMenuProps {
  variant: TrackVariant;
  onExtend?: (trackId: string, variantId: string) => void;
  onCover?: (trackId: string, variantId: string) => void;
  onSeparateStems?: (trackId: string, variantId: string) => void;
  onSetAsReference?: (variantId: string) => void;
}

const VariantActionMenuComponent = ({
  variant,
  onExtend,
  onCover,
  onSeparateStems,
  onSetAsReference,
}: VariantActionMenuProps) => {
  const hasActions = onExtend || onCover || onSeparateStems || onSetAsReference;

  if (!hasActions) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="Действия с вариантом"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {onExtend && (
          <DropdownMenuItem onClick={() => onExtend(variant.parentTrackId, variant.id)}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Расширить вариант
          </DropdownMenuItem>
        )}
        {onCover && (
          <DropdownMenuItem onClick={() => onCover(variant.parentTrackId, variant.id)}>
            <Music2 className="mr-2 h-4 w-4" />
            Создать кавер
          </DropdownMenuItem>
        )}
        {onSeparateStems && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSeparateStems(variant.parentTrackId, variant.id)}>
              <Scissors className="mr-2 h-4 w-4" />
              Разделить на стемы
            </DropdownMenuItem>
          </>
        )}
        {onSetAsReference && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSetAsReference(variant.id)}>
              <FileAudio className="mr-2 h-4 w-4" />
              Использовать как референс
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const VariantActionMenu = memo(VariantActionMenuComponent);
