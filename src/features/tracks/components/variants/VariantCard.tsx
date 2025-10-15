import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Star, Trash2 } from '@/utils/iconImports';
import { getVersionLabel } from '@/utils/versionLabels';
import { formatTrackVersionDuration } from '../trackVersionUtils';
import { VariantActionMenu } from './VariantActionMenu';
import type { TrackVariant, VariantActionHandlers } from '@/features/tracks/types/variant';

interface VariantCardProps {
  variant: TrackVariant;
  isPlaying: boolean;
  isCurrentVariant: boolean;
  showDeleteButton: boolean;
  handlers: VariantActionHandlers;
}

const VariantCardComponent = ({
  variant,
  isPlaying,
  isCurrentVariant,
  showDeleteButton,
  handlers,
}: VariantCardProps) => {
  const variantLabel = getVersionLabel({
    versionNumber: variant.variantIndex,
    isOriginal: variant.isPrimaryVariant,
    isMaster: variant.isPreferredVariant,
  });

  return (
    <Card
      className={`p-3 transition-all hover:bg-muted/50 ${
        variant.isPreferredVariant ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant={isCurrentVariant && isPlaying ? 'default' : 'outline'}
          onClick={() => handlers.onPlay(variant.id)}
          aria-label={isPlaying ? `Пауза ${variantLabel}` : `Воспроизвести ${variantLabel}`}
          className="h-10 w-10 flex-shrink-0"
        >
          {isCurrentVariant && isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{variantLabel}</span>
            {variant.isPreferredVariant && (
              <Badge variant="default" className="gap-1 text-xs">
                <Star className="w-3 h-3 fill-current" />
                Главная
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTrackVersionDuration(variant.duration)}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <VariantActionMenu
            variant={variant}
            onExtend={handlers.onExtend}
            onCover={handlers.onCover}
            onSeparateStems={handlers.onSeparateStems}
            onSetAsReference={handlers.onSetAsReference}
          />

          {!variant.isPreferredVariant && !variant.isPrimaryVariant && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlers.onSetPreferred(variant.id)}
              className="text-xs h-8"
            >
              <Star className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Главная</span>
            </Button>
          )}

          {showDeleteButton && !variant.isPrimaryVariant && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handlers.onDelete(variant.id)}
              className="h-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export const VariantCard = memo(VariantCardComponent);
