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
import { TagBadge } from './TagBadge';
import { TagPalette } from './TagPalette';
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

interface SectionCardProps {
  section: Section;
  onUpdate: (section: Section) => void;
  onDelete: () => void;
  onAddTag: (tag: Tag) => void;
  onRemoveTag: (tagId: string) => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  onUpdate,
  onDelete,
  onAddTag,
  onRemoveTag,
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
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleLinesChange = (value: string) => {
    onUpdate({ ...section, lines: value.split('\n') });
  };

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      onUpdate({ ...section, title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onUpdate({ ...section, isCollapsed: newCollapsed });
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "transition-all duration-200",
          isDragging && "shadow-lg ring-2 ring-primary"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>

          {isEditingTitle ? (
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
              className="h-8 flex-1 font-semibold"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="flex-1 text-left font-semibold hover:text-primary transition-colors"
            >
              {section.title}
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapse}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Title
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTagPalette(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tags
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!isCollapsed && (
          <div className="p-4 space-y-4">
            {/* Tags */}
            {section.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {section.tags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    onRemove={() => onRemoveTag(tag.id)}
                  />
                ))}
              </div>
            )}

            {/* Lyrics */}
            <Textarea
              value={section.lines.join('\n')}
              onChange={(e) => handleLinesChange(e.target.value)}
              placeholder="Enter lyrics..."
              className="min-h-[120px] resize-none font-mono text-sm"
            />

            {/* Quick Add Tag Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTagPalette(true)}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Tags
            </Button>
          </div>
        )}
      </Card>

      {/* Tag Palette Dialog */}
      <Dialog open={showTagPalette} onOpenChange={setShowTagPalette}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Add Tags to {section.title?.trim() ? section.title : 'section'}
            </DialogTitle>
            <DialogDescription>
              Choose tags to annotate this section. Selected tags will be added
              immediately.
            </DialogDescription>
          </DialogHeader>
          <TagPalette
            onAddTag={(tag) => {
              onAddTag(tag);
              setShowTagPalette(false);
            }}
            excludeCategories={['section']}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
