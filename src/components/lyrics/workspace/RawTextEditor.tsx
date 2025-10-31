import React, { useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { exportToSunoFormat } from '@/utils/lyricsParser';
import { SongDocument } from '@/types/lyrics';
import { cn } from '@/lib/utils';

interface RawTextEditorProps {
  document: SongDocument;
  onChange: (text: string) => void;
  readOnly?: boolean;
  className?: string;
}

export const RawTextEditor: React.FC<RawTextEditorProps> = ({
  document,
  onChange,
  readOnly = false,
  className
}) => {
  const rawText = exportToSunoFormat(document);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <Textarea
      value={rawText}
      onChange={handleChange}
      readOnly={readOnly}
      className={cn(
        "min-h-[500px] font-mono text-sm resize-none",
        "focus-visible:ring-1",
        className
      )}
      placeholder="Enter lyrics in Suno format...

Example:
[Tempo: 120 BPM] [Key: C minor]

[Intro] [Piano] [Ambient]

[Verse 1] [Lead Vocal] [Melancholic]
Walking through the city lights
Dreams fade into the night

[Chorus] [Euphoric] [Building Intensity]
We rise above the shadows
Hearts beating as one"
      spellCheck={false}
    />
  );
};
