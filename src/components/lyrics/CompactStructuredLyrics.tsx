/**
 * Compact StructuredLyrics - minimal lyrics display for variant panels
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface CompactStructuredLyricsProps {
  lyrics: string;
}

export const CompactStructuredLyrics: React.FC<CompactStructuredLyricsProps> = ({ lyrics }) => {
  // Parse lyrics into sections
  const sections = parseLyrics(lyrics);

  return (
    <div className="space-y-3 text-sm">
      {sections.map((section, index) => (
        <div key={index} className="space-y-1">
          {section.title && (
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="h-5 px-2 text-xs font-medium">
                {section.title}
              </Badge>
            </div>
          )}
          <div className="space-y-0.5 pl-2 text-muted-foreground leading-relaxed">
            {section.lines.map((line, lineIndex) => (
              <div key={lineIndex} className="text-xs">
                {line || <span className="text-muted-foreground/40">•</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface LyricsSection {
  title: string;
  lines: string[];
}

function parseLyrics(lyrics: string): LyricsSection[] {
  const sections: LyricsSection[] = [];
  const lines = lyrics.split('\n');
  
  let currentSection: LyricsSection | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if line is a section header (e.g., [Verse], [Chorus])
    const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
    
    if (sectionMatch) {
      // Save previous section if exists
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        title: sectionMatch[1],
        lines: []
      };
    } else if (currentSection) {
      // Add line to current section
      currentSection.lines.push(trimmedLine);
    } else {
      // No section yet, create default section
      if (trimmedLine) {
        if (!currentSection) {
          currentSection = { title: '', lines: [] };
        }
        currentSection.lines.push(trimmedLine);
      }
    }
  }

  // Add last section
  if (currentSection && currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [{ title: '', lines: lyrics.split('\n') }];
}
