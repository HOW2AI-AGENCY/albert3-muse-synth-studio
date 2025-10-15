import React, { useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrackVersions } from '@/features/tracks/hooks';
import { cn } from '@/lib/utils';

interface TrackVariantSelectorProps {
  trackId: string;
  currentVersionIndex: number;
  onVersionChange: (versionIndex: number) => void;
  className?: string;
}

export const TrackVariantSelector: React.FC<TrackVariantSelectorProps> = ({ 
  trackId,
  currentVersionIndex,
  onVersionChange,
  className 
}) => {
  const { versionCount, isLoading } = useTrackVersions(trackId, true);

  // Переключение на следующую версию
  const handleNextVersion = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (currentVersionIndex + 1) % (versionCount + 1);
    onVersionChange(nextIndex);
  }, [currentVersionIndex, versionCount, onVersionChange]);

  // Не показываем селектор если нет дополнительных версий
  if (isLoading || versionCount === 0) {
    return null;
  }

  const totalVersions = versionCount + 1;
  const displayIndex = currentVersionIndex + 1;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleNextVersion}
      className={cn(
        "h-6 px-2 gap-1 text-xs font-medium bg-background/90 backdrop-blur-sm hover:bg-background",
        className
      )}
    >
      <span>{displayIndex}/{totalVersions}</span>
      <ChevronDown className="h-3 w-3" />
    </Button>
  );
};