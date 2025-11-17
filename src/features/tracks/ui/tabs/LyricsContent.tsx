/**
 * Lyrics Tab Content
 * Structured lyrics with copy button
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <div className="flex items-center justify-center h-[calc(100vh-320px)] text-muted-foreground">
        <p className="text-sm">Текст песни отсутствует</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-320px)]">
      <ScrollArea className="flex-1">
        <StructuredLyricsViewer lyrics={lyrics} className="p-4" />
      </ScrollArea>

      {/* Sticky Copy Button */}
      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent p-4 border-t">
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
