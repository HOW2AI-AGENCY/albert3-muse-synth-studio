import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from '@/utils/iconImports';
import { cn } from '@/lib/utils';

interface AudioReferenceSectionProps {
  referenceFileName: string | null;
  referenceAudioUrl?: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  isUploading: boolean;
  isGenerating: boolean;
}

export const AudioReferenceSection = memo(({
  referenceFileName,
  referenceAudioUrl: _referenceAudioUrl,
  onFileSelect,
  onRemove,
  isUploading,
  isGenerating,
}: AudioReferenceSectionProps) => {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Референсное аудио</Label>
      
      {referenceFileName ? (
        <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/20">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{referenceFileName}</p>
            <p className="text-[10px] text-muted-foreground">Аудио загружено</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onRemove}
            disabled={isGenerating}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            onChange={onFileSelect}
            disabled={isUploading || isGenerating}
            className="sr-only"
          />
          <Label
            htmlFor="audio-upload"
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-3 rounded-md border-2 border-dashed cursor-pointer transition-colors",
              "hover:bg-secondary/20 hover:border-primary/30",
              (isUploading || isGenerating) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Загрузка...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">Загрузить аудио</span>
                <span className="text-[10px] text-muted-foreground">MP3, WAV, OGG</span>
              </>
            )}
          </Label>
        </div>
      )}
    </div>
  );
});

AudioReferenceSection.displayName = 'AudioReferenceSection';
