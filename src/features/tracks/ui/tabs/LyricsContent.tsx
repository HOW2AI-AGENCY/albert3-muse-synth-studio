/**
 * Lyrics Tab Content
 * Structured lyrics with copy button
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StructuredLyricsViewer } from '@/components/lyrics/StructuredLyricsViewer';
import { Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LyricsContentProps {
  lyrics: string;
}

export const LyricsContent = ({ lyrics }: LyricsContentProps) => {
  const [copied, setCopied] = useState(false);

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
      {/* Lyrics Viewer */}
      <StructuredLyricsViewer lyrics={lyrics} />

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
