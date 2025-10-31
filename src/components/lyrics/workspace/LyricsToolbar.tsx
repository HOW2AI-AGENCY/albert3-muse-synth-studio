import React from 'react';
import { EditorMode, LintIssue } from '@/types/lyrics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Wand2,
  Plus,
  Eye,
  Edit2,
  FileText,
  AlertCircle,
  Download,
  MoreVertical
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';

interface LyricsToolbarProps {
  mode: 'view' | 'edit' | 'generate';
  viewMode: 'visual' | 'raw';
  onViewModeChange: (mode: 'visual' | 'raw') => void;
  editorMode: EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  stats: {
    lines: number;
    words: number;
    chars: number;
    sections: number;
  };
  lintIssues: LintIssue[];
  showAITools: boolean;
  onGenerate?: () => void;
  onAddSection: () => void;
  readOnly: boolean;
  compact: boolean;
}

export const LyricsToolbar: React.FC<LyricsToolbarProps> = ({
  mode,
  viewMode,
  onViewModeChange,
  stats,
  lintIssues,
  showAITools,
  onGenerate,
  onAddSection,
  readOnly,
  compact
}) => {
  const errorCount = lintIssues.filter(i => i.severity === 'error').length;
  const warningCount = lintIssues.filter(i => i.severity === 'warning').length;

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 border-b bg-muted/30",
      compact && "p-1.5"
    )}>
      {/* View Mode Toggle */}
      {mode !== 'view' && (
        <>
          <div className="flex items-center gap-1 bg-background rounded-md p-1">
            <Button
              variant={viewMode === 'visual' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('visual')}
              className={cn("h-7 px-2", compact && "h-6 px-1.5 text-[10px]")}
            >
              <Eye className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
              {!compact && <span className="ml-1.5">Visual</span>}
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('raw')}
              className={cn("h-7 px-2", compact && "h-6 px-1.5 text-[10px]")}
            >
              <Edit2 className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
              {!compact && <span className="ml-1.5">Raw</span>}
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Actions */}
      {!readOnly && viewMode === 'visual' && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddSection}
            className={cn("h-7 gap-1.5", compact && "h-6 px-1.5 text-[10px]")}
          >
            <Plus className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
            {!compact && <span>Add Section</span>}
          </Button>

          {showAITools && onGenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerate}
              className={cn("h-7 gap-1.5", compact && "h-6 px-1.5 text-[10px]")}
            >
              <Wand2 className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
              {!compact && <span>AI Generate</span>}
            </Button>
          )}
        </>
      )}

      <div className="flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-2">
        <Badge 
          variant="secondary" 
          className={cn(
            "h-6 px-2 text-[10px] font-mono",
            compact && "h-5 px-1.5 text-[9px]"
          )}
        >
          <FileText className={cn("h-3 w-3 mr-1", compact && "h-2.5 w-2.5")} />
          {stats.sections}
        </Badge>

        {!compact && (
          <>
            <span className="text-xs text-muted-foreground">
              {stats.lines} lines
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {stats.words} words
            </span>
          </>
        )}

        {/* Lint Issues */}
        {(errorCount > 0 || warningCount > 0) && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <Badge
              variant={errorCount > 0 ? 'destructive' : 'secondary'}
              className={cn(
                "h-6 px-2 text-[10px]",
                compact && "h-5 px-1.5 text-[9px]"
              )}
            >
              <AlertCircle className={cn("h-3 w-3 mr-1", compact && "h-2.5 w-2.5")} />
              {errorCount + warningCount}
            </Badge>
          </>
        )}
      </div>

      {/* More Actions */}
      {!compact && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
