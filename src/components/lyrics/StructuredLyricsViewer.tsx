/**
 * Structured Lyrics Viewer with Copy Button
 * Парсит лирику по секциям ([Verse], [Chorus], etc.) и отображает структурированно
 */
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check } from '@/utils/iconImports';
import { toast } from '@/hooks/use-toast';

interface StructuredLyricsViewerProps {
  lyrics: string;
  compact?: boolean;
  className?: string;
}

interface LyricsSection {
  title: string;
  lines: string[];
}

const parseLyricsSections = (lyrics: string): LyricsSection[] => {
  const sections: LyricsSection[] = [];
  const lines = lyrics.split('\n');
  
  let currentSection: LyricsSection | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Проверка на заголовок секции ([Verse], [Chorus], [Bridge], [Intro], [Outro], etc.)
    const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
    
    if (sectionMatch) {
      // Сохраняем предыдущую секцию
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      
      // Начинаем новую секцию
      currentSection = {
        title: sectionMatch[1],
        lines: []
      };
    } else if (currentSection) {
      // Добавляем строку в текущую секцию
      currentSection.lines.push(trimmedLine);
    } else if (trimmedLine) {
      // Если нет секции, создаем секцию "Intro" по умолчанию
      if (!currentSection) {
        currentSection = { title: 'Intro', lines: [] };
      }
      currentSection.lines.push(trimmedLine);
    }
  }

  // Добавляем последнюю секцию
  if (currentSection && currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [{ title: '', lines: lyrics.split('\n') }];
};

const getSectionIcon = (title: string): string => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('verse')) return '📝';
  if (lowerTitle.includes('chorus')) return '🎵';
  if (lowerTitle.includes('bridge')) return '🌉';
  if (lowerTitle.includes('intro')) return '🎬';
  if (lowerTitle.includes('outro')) return '🎭';
  if (lowerTitle.includes('hook')) return '🎣';
  if (lowerTitle.includes('pre')) return '🔊';
  if (lowerTitle.includes('instrumental')) return '🎸';
  
  return '🎤';
};

const getSectionColor = (title: string): string => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('verse')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
  if (lowerTitle.includes('chorus')) return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
  if (lowerTitle.includes('bridge')) return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
  if (lowerTitle.includes('intro')) return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
  if (lowerTitle.includes('outro')) return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
  
  return 'bg-muted/50 text-foreground/80 border-border/50';
};

export const StructuredLyricsViewer: React.FC<StructuredLyricsViewerProps> = ({ 
  lyrics, 
  compact = false,
  className = '' 
}) => {
  const [copied, setCopied] = useState(false);
  const sections = parseLyricsSections(lyrics);

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
        title: '❌ Ошибка',
        description: 'Не удалось скопировать текст',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Кнопка копирования */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Скопировано
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Копировать
            </>
          )}
        </Button>
      </div>

      {/* Секции лирики */}
      <div className={`space-y-${compact ? '2' : '3'}`}>
        {sections.map((section, index) => (
          <div 
            key={index} 
            className={`rounded-lg border ${compact ? 'p-2' : 'p-3'} ${
              section.title ? 'bg-secondary/20' : 'bg-muted/20'
            }`}
          >
            {section.title && (
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary"
                  className={`${compact ? 'h-5 px-2 text-[10px]' : 'h-6 px-2.5 text-xs'} font-semibold ${getSectionColor(section.title)}`}
                >
                  <span className="mr-1">{getSectionIcon(section.title)}</span>
                  {section.title}
                </Badge>
              </div>
            )}
            
            <div className={`space-y-${compact ? '0.5' : '1'} ${section.title ? 'pl-2' : ''}`}>
              {section.lines.map((line, lineIndex) => (
                <div 
                  key={lineIndex} 
                  className={`${compact ? 'text-[11px]' : 'text-xs'} leading-relaxed text-foreground/90`}
                >
                  {line || <span className="text-muted-foreground/30">•</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
