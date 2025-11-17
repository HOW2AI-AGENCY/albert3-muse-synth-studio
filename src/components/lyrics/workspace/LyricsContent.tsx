import React from 'react';
import { SongDocument, Tag, Section } from '@/types/lyrics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { LyricsSection } from './LyricsSection';
import { GlobalTagsBar } from './GlobalTagsBar';

interface LyricsContentProps {
  mode: 'view' | 'edit' | 'generate';
  viewMode: 'visual' | 'raw';
  document: SongDocument;
  onDocumentChange: (doc: SongDocument) => void;
  onSectionUpdate: (sectionId: string, updates: Partial<Section>) => void;
  onSectionDelete: (sectionId: string) => void;
  onReorder: (sections: Section[]) => void;
  onAddTag: (sectionId: string, tag: Tag) => void;
  onRemoveTag: (sectionId: string, tagId: string) => void;
  onGlobalTagsChange: (tags: Tag[]) => void;
  showTags: boolean;
  showSectionControls: boolean;
  readOnly: boolean;
  compact: boolean;
}

export const LyricsContent: React.FC<LyricsContentProps> = ({
  viewMode,
  document,
  onSectionUpdate,
  onSectionDelete,
  onReorder,
  onAddTag,
  onRemoveTag,
  onGlobalTagsChange,
  showTags,
  showSectionControls,
  readOnly,
  compact
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = document.sections.findIndex((s) => s.id === active.id);
      const newIndex = document.sections.findIndex((s) => s.id === over.id);
      
      const newSections = arrayMove(document.sections, oldIndex, newIndex);
      onReorder(newSections);
    }
  };

  // Raw text mode
  if (viewMode === 'raw') {
    const rawText = document.sections
      .map(s => {
        const tags = s.tags.map(t => t.raw).join(' ');
        const header = `[${s.title}]${tags ? ' ' + tags : ''}`;
        return `${header}\n${s.lines.join('\n')}`;
      })
      .join('\n\n');

    const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Пользователь может редактировать raw text
      // TODO: Implement parsing and updating document from raw text
      console.log('Raw text changed:', e.target.value);
    };

    return (
      <ScrollArea className="flex-1 p-4 w-full min-w-0 overflow-auto scrollbar-styled">
        <Textarea
          value={rawText}
          onChange={handleRawTextChange}
          readOnly={false}
          disabled={readOnly}
          className="w-full max-w-full min-w-0 min-h-[500px] font-mono text-sm resize-none break-words"
          placeholder="Введите текст песни в формате Suno...

Пример:
[Intro] [Piano] [Ambient]

[Verse 1] [Lead Vocal] [Melancholic]
Walking through the city lights
Dreams fade into the night

[Chorus] [Euphoric] [Building Intensity]
We rise above the shadows
Hearts beating as one"
        />
      </ScrollArea>
    );
  }

  // Visual mode
  return (
    <ScrollArea className="flex-1 w-full min-w-0 overflow-auto scrollbar-styled">
      <div className={cn("p-4 space-y-4 w-full max-w-full min-w-0", compact && "p-2 space-y-2")}>
        {/* Global Tags */}
        {showTags && document.globalTags.length > 0 && (
          <GlobalTagsBar
            tags={document.globalTags}
            onTagsChange={onGlobalTagsChange}
            readOnly={readOnly}
          />
        )}

        {/* Sections */}
        {document.sections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No lyrics yet</p>
            {!readOnly && (
              <p className="text-xs mt-1">Add a section to get started</p>
            )}
          </div>
        ) : readOnly || !showSectionControls ? (
          // Static list without drag-and-drop
          <div className="space-y-3 w-full max-w-full min-w-0">
            {document.sections.map((section) => (
              <LyricsSection
                key={section.id}
                section={section}
                onUpdate={(updates) => onSectionUpdate(section.id, updates)}
                onDelete={() => onSectionDelete(section.id)}
                onAddTag={(tag) => onAddTag(section.id, tag)}
                onRemoveTag={(tagId) => onRemoveTag(section.id, tagId)}
                showTags={showTags}
                showControls={showSectionControls}
                readOnly={readOnly}
                compact={compact}
              />
            ))}
          </div>
        ) : (
          // Draggable list
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={document.sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 w-full max-w-full min-w-0">
                {document.sections.map((section) => (
                  <LyricsSection
                    key={section.id}
                    section={section}
                    onUpdate={(updates) => onSectionUpdate(section.id, updates)}
                    onDelete={() => onSectionDelete(section.id)}
                    onAddTag={(tag) => onAddTag(section.id, tag)}
                    onRemoveTag={(tagId) => onRemoveTag(section.id, tagId)}
                    showTags={showTags}
                    showControls={showSectionControls}
                    readOnly={readOnly}
                    compact={compact}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </ScrollArea>
  );
};
