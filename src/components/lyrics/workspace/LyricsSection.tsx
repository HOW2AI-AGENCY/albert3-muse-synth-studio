import React, { useState } from 'react';
import { Section, Tag } from '@/types/lyrics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TagBadge } from '../TagBadge';
import { TagPalette } from '../TagPalette';
import {
  GripVertical,
  MoreVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit2
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LyricsSectionProps {
  section: Section;
  onUpdate: (updates: Partial<Section>) => void;
  onDelete: () => void;
  onAddTag: (tag: Tag) => void;
  onRemoveTag: (tagId: string) => void;
  showTags: boolean;
  showControls: boolean;
  readOnly: boolean;
  compact: boolean;
}

export const LyricsSection: React.FC<LyricsSectionProps> = ({
  section,
  onUpdate,
  onDelete,
  onAddTag,
  onRemoveTag,
  showTags,
  showControls,
  readOnly,
  compact
}) => {
  const [isCollapsed, setIsCollapsed] = useState(section.isCollapsed || false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showTagPalette, setShowTagPalette] = useState(false);
  const [editedTitle, setEditedTitle] = useState(section.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: readOnly || !showControls });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleLinesChange = (value: string) => {
    onUpdate({ lines: value.split('\n') });
  };

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      onUpdate({ title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onUpdate({ isCollapsed: newCollapsed });
  };

  // Auto-numbering for Verse sections
  const displayTitle = React.useMemo(() => {
    return section.title;
  }, [section.title]);

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "transition-all duration-200 min-w-0",
          isDragging && "shadow-lg ring-2 ring-primary",
          compact && "text-sm"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center gap-2 p-3 border-b bg-muted/30 min-w-0",
          compact && "p-2 gap-1.5"
        )}>
          {showControls && !readOnly && (
            <button
              className="cursor-grab active:cursor-grabbing touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className={cn(
                "h-5 w-5 text-muted-foreground",
                compact && "h-4 w-4"
              )} />
            </button>
          )}

          {isEditingTitle && !readOnly ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setEditedTitle(section.title);
                  setIsEditingTitle(false);
                }
              }}
              className={cn(
                "h-8 flex-1 font-semibold",
                compact && "h-7 text-sm"
              )}
              autoFocus
            />
          ) : (
            <button
              onClick={() => !readOnly && setIsEditingTitle(true)}
                className={cn(
                "flex-1 text-left font-semibold hover:text-primary transition-colors min-w-0 truncate",
                readOnly && "cursor-default hover:text-current",
                compact && "text-sm"
              )}
            >
              {displayTitle}
            </button>
          )}

          {showControls && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCollapse}
                className={cn("h-8 w-8 p-0", compact && "h-7 w-7")}
              >
                {isCollapsed ? (
                  <ChevronDown className={cn("h-4 w-4", compact && "h-3.5 w-3.5")} />
                ) : (
                  <ChevronUp className={cn("h-4 w-4", compact && "h-3.5 w-3.5")} />
                )}
              </Button>

              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0", compact && "h-7 w-7")}>
                      <MoreVertical className={cn("h-4 w-4", compact && "h-3.5 w-3.5")} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Изменить название
                    </DropdownMenuItem>
                    {showTags && (
                      <DropdownMenuItem onClick={() => setShowTagPalette(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить теги
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить секцию
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>

        {!isCollapsed && (
          <div className={cn("p-4 space-y-4", compact && "p-3 space-y-3")}>
            {/* Tags */}
            {showTags && section.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {section.tags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    onRemove={readOnly ? undefined : () => onRemoveTag(tag.id)}
                  />
                ))}
              </div>
            )}

            {/* Lyrics */}
            <Textarea
              value={section.lines.join('\n')}
              onChange={(e) => handleLinesChange(e.target.value)}
              placeholder="Введите текст..."
              className={cn(
                "w-full max-w-full min-w-0 min-h-[120px] resize-none font-mono text-sm break-words",
                compact && "min-h-[100px] text-xs"
              )}
              readOnly={readOnly}
            />

            {/* Quick Add Tag Button */}
            {showTags && !readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTagPalette(true)}
                className={cn("w-full", compact && "h-8 text-xs")}
              >
                <Plus className={cn("mr-2 h-4 w-4", compact && "mr-1.5 h-3 w-3")} />
                Добавить теги
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Tag Palette Dialog */}
      {!readOnly && (
        <Dialog open={showTagPalette} onOpenChange={setShowTagPalette}>
          <DialogContent className="max-w-5xl w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-base sm:text-lg">
                Добавить теги к секции {section.title?.trim() ? `"${section.title}"` : ''}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Выберите теги для аннотации секции. Все теги будут на английском языке.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <TagPalette
                onAddTag={(tag) => {
                  onAddTag(tag);
                  setShowTagPalette(false);
                }}
                excludeCategories={['section']}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
