import React, { useState, useEffect } from 'react';
import { SongDocument, Section, Tag, LintIssue } from '@/types/lyrics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionCard } from './SectionCard';
import { TagBadge } from './TagBadge';
import { 
  parseLyrics, 
  exportToSunoFormat, 
  lintDocument,
  deduplicateTags 
} from '@/utils/lyricsParser';
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
import { 
  FileText, 
  Sparkles, 
  AlertCircle, 
  CheckCircle,
  Plus,
  Download
} from '@/utils/iconImports';

interface LyricsEditorAdvancedProps {
  lyrics: string;
  onLyricsChange: (lyrics: string) => void;
}

export const LyricsEditorAdvanced: React.FC<LyricsEditorAdvancedProps> = ({
  lyrics,
  onLyricsChange,
}) => {
  const [document, setDocument] = useState<SongDocument>({
    id: 'song-' + Date.now(),
    globalTags: [],
    sections: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [rawText, setRawText] = useState(lyrics);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const [currentMode, setCurrentMode] = useState<'visual' | 'raw'>('visual');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Parse lyrics on mount and when rawText changes
  useEffect(() => {
    if (rawText) {
      const sections = parseLyrics(rawText);
      setDocument(prev => ({
        ...prev,
        sections,
        updatedAt: new Date().toISOString(),
      }));
    }
  }, []);

  // Lint on document change
  useEffect(() => {
    const issues = lintDocument(document);
    setLintIssues(issues);
  }, [document]);

  // Export to parent on document change
  useEffect(() => {
    const exported = exportToSunoFormat(document);
    onLyricsChange(exported);
  }, [document, onLyricsChange]);

  const handleRawTextChange = (value: string) => {
    setRawText(value);
    const sections = parseLyrics(value);
    setDocument(prev => ({
      ...prev,
      sections,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDocument(prev => {
      const oldIndex = prev.sections.findIndex(s => s.id === active.id);
      const newIndex = prev.sections.findIndex(s => s.id === over.id);
      const newSections = arrayMove(prev.sections, oldIndex, newIndex);
      
      return {
        ...prev,
        sections: newSections.map((s, i) => ({ ...s, order: i })),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleUpdateSection = (sectionId: string, updated: Section) => {
    setDocument(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? updated : s),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteSection = (sectionId: string) => {
    setDocument(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: 'Untitled',
      tags: [],
      lines: [],
      order: document.sections.length,
    };
    setDocument(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddTagToSection = (sectionId: string, tag: Tag) => {
    setDocument(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id === sectionId) {
          const updatedTags = deduplicateTags([...s.tags, tag]);
          return { ...s, tags: updatedTags };
        }
        return s;
      }),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRemoveTagFromSection = (sectionId: string, tagId: string) => {
    setDocument(prev => ({
      ...prev,
      sections: prev.sections.map(s => {
        if (s.id === sectionId) {
          return { ...s, tags: s.tags.filter(t => t.id !== tagId) };
        }
        return s;
      }),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleExport = () => {
    const exported = exportToSunoFormat(document);
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = 'lyrics.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const errorCount = lintIssues.filter(i => i.severity === 'error').length;
  const warningCount = lintIssues.filter(i => i.severity === 'warning').length;

  return (
    <Card className="w-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Lyrics & Tags Editor</h3>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {errorCount} errors
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {warningCount} warnings
              </Badge>
            )}
            {errorCount === 0 && warningCount === 0 && (
              <Badge variant="default" className="gap-1 bg-green-500">
                <CheckCircle className="h-3 w-3" />
                Valid
              </Badge>
            )}
          </div>
        </div>

        {/* Global Tags */}
        {document.globalTags.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground">Global:</span>
            {document.globalTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </div>

      <Tabs value={currentMode} onValueChange={(v) => setCurrentMode(v as 'visual' | 'raw')}>
        <div className="px-4 pt-4">
          <TabsList className="w-full">
            <TabsTrigger value="visual" className="flex-1">
              <FileText className="mr-2 h-4 w-4" />
              Visual Editor
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex-1">
              <Sparkles className="mr-2 h-4 w-4" />
              Raw Text
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visual" className="p-4 space-y-4">
          {/* Lint Issues */}
          {lintIssues.length > 0 && (
            <ScrollArea className="h-[120px]">
              <div className="space-y-2">
                {lintIssues.map((issue) => (
                  <Alert
                    key={issue.id}
                    variant={issue.severity === 'error' ? 'destructive' : 'default'}
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {issue.message}
                      {issue.suggestion && (
                        <span className="block text-xs mt-1 opacity-80">
                          💡 {issue.suggestion}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Sections */}
          <ScrollArea className="h-[300px] sm:h-[400px]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={document.sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 pr-4">
                  {document.sections.map((section) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      onUpdate={(updated) => handleUpdateSection(section.id, updated)}
                      onDelete={() => handleDeleteSection(section.id)}
                      onAddTag={(tag) => handleAddTagToSection(section.id, tag)}
                      onRemoveTag={(tagId) => handleRemoveTagFromSection(section.id, tagId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>

          <div className="flex gap-2">
            <Button onClick={handleAddSection} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="raw" className="p-4 space-y-4">
          <Textarea
            value={rawText}
            onChange={(e) => handleRawTextChange(e.target.value)}
            placeholder="Paste or type your lyrics with [Tags] here..."
            className="min-h-[500px] font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentMode('visual')}
              variant="outline"
              className="flex-1"
            >
              Parse & Edit Visually
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
