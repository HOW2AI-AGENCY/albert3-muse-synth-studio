/**
 * Legacy LyricsInput component - now an alias to LyricsWorkspace
 * Maintained for backward compatibility
 */
import React from 'react';
import { LyricsWorkspace } from '../workspace/LyricsWorkspace';
import { useIsMobile } from '@/hooks/use-mobile';

interface LyricsInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerateLyrics?: () => void;
  isGenerating?: boolean;
  placeholder?: string;
  label?: string;
  maxLines?: number;
  compact?: boolean;
}

export const LyricsInput: React.FC<LyricsInputProps> = ({
  value,
  onChange,
  onGenerateLyrics,
  isGenerating,
  compact = false,
}) => {
  const isMobile = useIsMobile();

  const handleGeneratedLyrics = (lyrics: string) => {
    onChange(lyrics);
  };

  return (
    <div className="w-full max-w-full overflow-hidden">
      <LyricsWorkspace
        mode="edit"
        value={value}
        onChange={onChange}
        onGenerate={onGenerateLyrics}
        onGenerateLyrics={handleGeneratedLyrics}
        readOnly={isGenerating}
        showAITools={false}
        showTags={true}
        showSectionControls={true}
        compact={compact || isMobile}
        className="w-full max-w-full"
      />
    </div>
  );
};
