/**
 * Lyrics Tab Content
 * Structured lyrics with copy button and optional synchronized karaoke mode
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StructuredLyricsViewer } from '@/components/lyrics/StructuredLyricsViewer';
import { LyricsDisplay } from '@/components/player/LyricsDisplay';
import { Copy, Check, Mic2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface LyricsContentProps {
  lyrics: string;
  trackId?: string;
  sunoTaskId?: string;
  sunoId?: string;
}

export const LyricsContent = ({ lyrics, sunoTaskId, sunoId }: LyricsContentProps) => {
  const [copied, setCopied] = useState(false);
  const [showKaraoke, setShowKaraoke] = useState(false);

  // Check if karaoke mode is available
  const hasKaraokeData = Boolean(sunoTaskId && sunoId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lyrics);
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

  if (!lyrics) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
        <p className="text-sm">Текст песни отсутствует</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Karaoke Toggle */}
      {hasKaraokeData && (
        <div className="flex items-center justify-between gap-2 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Караоке режим</span>
            {showKaraoke && (
              <Badge variant="secondary" className="text-xs">
                Синхронизировано
              </Badge>
            )}
          </div>
          <Button
            variant={showKaraoke ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowKaraoke(!showKaraoke)}
          >
            {showKaraoke ? 'Показать текст' : 'Включить караоке'}
          </Button>
        </div>
      )}

      {/* Synchronized Karaoke Display */}
      {showKaraoke && hasKaraokeData ? (
        <div className="min-h-[300px] max-h-[500px] overflow-hidden rounded-lg border bg-muted/30">
          <LyricsDisplay
            taskId={sunoTaskId || ''}
            audioId={sunoId || ''}
            fallbackLyrics={lyrics}
          />
        </div>
      ) : (
        /* Static Lyrics Viewer */
        <StructuredLyricsViewer lyrics={lyrics} showCopyButton={false} />
      )}

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
