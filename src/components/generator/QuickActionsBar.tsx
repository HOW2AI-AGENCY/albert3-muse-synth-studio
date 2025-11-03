import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, User, Sparkles, Music } from '@/utils/iconImports';
import { cn } from '@/lib/utils';

interface QuickActionsBarProps {
  hasAudio: boolean;
  hasPersona: boolean;
  hasProject: boolean;
  hasInspo: boolean;
  onAudioClick: () => void;
  onPersonaClick: () => void;
  onProjectClick: () => void;
  onInspoClick: () => void;
  isGenerating: boolean;
}

export const QuickActionsBar = memo(({
  hasAudio,
  hasPersona,
  hasProject,
  hasInspo,
  onAudioClick,
  onPersonaClick,
  onProjectClick,
  onInspoClick,
  isGenerating,
}: QuickActionsBarProps) => {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border-b border-border/10 bg-background/95 backdrop-blur-sm">
      
        {/* Audio Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={hasAudio ? "default" : "outline"}
              size="sm"
              onClick={onAudioClick}
              disabled={isGenerating}
              className={cn(
                "h-8 sm:h-9 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium transition-all",
                hasAudio && "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              )}
            >
              <Upload className="h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden xs:inline">{hasAudio ? 'Audio' : '+ Audio'}</span>
              <span className="xs:hidden">Audio</span>
              {hasAudio && <span className="ml-0.5">✓</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Загрузить референсное аудио</p>
          </TooltipContent>
        </Tooltip>

        {/* Persona Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={hasPersona ? "default" : "outline"}
              size="sm"
              onClick={onPersonaClick}
              disabled={isGenerating}
              className={cn(
                "h-8 sm:h-9 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium transition-all",
                hasPersona && "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              )}
            >
              <User className="h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden xs:inline">{hasPersona ? 'Persona' : '+ Persona'}</span>
              <span className="xs:hidden">Persona</span>
              {hasPersona && <span className="ml-0.5">✓</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Выбрать голосовую персону</p>
          </TooltipContent>
        </Tooltip>

        {/* Project Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={hasProject ? "default" : "outline"}
              size="sm"
              onClick={onProjectClick}
              disabled={isGenerating}
              className={cn(
                "h-8 sm:h-9 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium transition-all",
                hasProject && "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              )}
            >
              <Music className="h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden xs:inline">{hasProject ? 'Project' : '+ Project'}</span>
              <span className="xs:hidden">Project</span>
              {hasProject && <span className="ml-0.5">✓</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Выбрать проект для генерации</p>
          </TooltipContent>
        </Tooltip>

        {/* Inspo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={hasInspo ? "default" : "outline"}
              size="sm"
              onClick={onInspoClick}
              disabled={isGenerating}
              className={cn(
                "h-8 sm:h-9 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium transition-all",
                hasInspo && "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              )}
            >
              <Sparkles className="h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden xs:inline">{hasInspo ? 'Inspo' : '+ Inspo'}</span>
              <span className="xs:hidden">Inspo</span>
              {hasInspo && <span className="ml-0.5">✓</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Проект для вдохновения</p>
          </TooltipContent>
        </Tooltip>
      
    </div>
  );
});

QuickActionsBar.displayName = 'QuickActionsBar';
