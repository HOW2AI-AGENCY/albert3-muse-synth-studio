/**
 * Lyrics Tab Content
 * Structured lyrics with copy button and optional synchronized karaoke mode
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { StructuredLyricsViewer } from '@/components/lyrics/StructuredLyricsViewer';
import { Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTrackVariants } from '@/features/tracks/hooks/useTrackVariants';

interface LyricsContentProps {
  lyrics: string;
  trackId?: string;
}

export const LyricsContent = ({ lyrics, trackId }: LyricsContentProps) => {
  const [copied, setCopied] = useState(false);

  // Load variants only if lyrics are missing but we have a trackId
  const { data: variantsData } = useTrackVariants(trackId || null, !lyrics && !!trackId);

  const effectiveLyrics = useMemo(() => {
    if (lyrics) return lyrics;
    const variants = (variantsData as any)?.variants || [];
    const preferred = variants.find((v: any) => v?.is_preferred_variant && v?.lyrics);
    if (preferred?.lyrics) return preferred.lyrics as string;
    const firstWithLyrics = variants.find((v: any) => v?.lyrics);
    return (firstWithLyrics?.lyrics as string) || '';
  }, [lyrics, variantsData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(effectiveLyrics);
      setCopied(true);
      toast({
        title: '✅ Скопировано',
        description: 'Текст лирики скопирован в буфер обмена',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать текст',
        variant: 'destructive',
      });
    }
  };

  if (!effectiveLyrics) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
        <p className="text-sm">Текст песни отсутствует</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StructuredLyricsViewer lyrics={effectiveLyrics} showCopyButton={false} />

      {/* Copy Button */}
      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-4">
        <Button
          onClick={handleCopy}
          variant={copied ? 'secondary' : 'default'}
          className="w-full touch-target-min"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Скопировано!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Копировать текст
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
