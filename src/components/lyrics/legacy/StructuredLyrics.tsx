/**
 * Legacy StructuredLyrics component - now an alias to LyricsWorkspace
 * Maintained for backward compatibility
 */
import React from 'react';
import { LyricsWorkspace } from '../workspace/LyricsWorkspace';

interface StructuredLyricsProps {
  lyrics: string;
}

export const StructuredLyrics: React.FC<StructuredLyricsProps> = ({ lyrics }) => {
  return (
    <LyricsWorkspace
      mode="view"
      value={lyrics}
      readOnly={true}
      showAITools={false}
      showTags={true}
      showSectionControls={false}
    />
  );
};
