import { useState, useMemo, useCallback, memo } from 'react';
import { SongDocument, Tag, Section, LintIssue, EditorMode } from '@/types/lyrics';
import { parseLyrics, exportToSunoFormat, lintDocument, extractTags } from '@/utils/lyricsParser';
import { LyricsToolbar } from './LyricsToolbar';
import { LyricsContent } from './LyricsContent';
import { cn } from '@/lib/utils';

export interface LyricsWorkspaceProps {
  mode: 'view' | 'edit' | 'generate';
  value: string;
  onChange?: (value: string) => void;
  onGenerate?: () => void;
  readOnly?: boolean;
  showAITools?: boolean;
  showTags?: boolean;
  showSectionControls?: boolean;
  compact?: boolean;
  className?: string;
}

export const LyricsWorkspace = memo<LyricsWorkspaceProps>(({
  mode,
  value,
  onChange,
  onGenerate,
  readOnly = false,
  showAITools = false,
  showTags = true,
  showSectionControls = true,
  compact = false,
  className
}) => {
  const [editorMode, setEditorMode] = useState<EditorMode>('scratch');
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');

  // Parse lyrics to document
  const document = useMemo<SongDocument>(() => {
    const sections = parseLyrics(value || '');
    const globalTags = extractTags(value || '').filter(t => 
      ['tempo', 'key', 'language', 'content'].includes(t.category)
    );

    return {
      id: `doc-${Date.now()}`,
      globalTags,
      sections,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [value]);

  // Lint issues
  const lintIssues = useMemo<LintIssue[]>(() => {
    return lintDocument(document);
  }, [document]);

  // Stats
  const stats = useMemo(() => {
    const text = value || '';
    const lines = text.split('\n').filter(l => l.trim()).length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const sectionsCount = document.sections.length;

    return { lines, words, chars, sections: sectionsCount };
  }, [value, document.sections.length]);

  // Update document
  const handleDocumentChange = useCallback((newDoc: SongDocument) => {
    if (onChange && !readOnly) {
      const newText = exportToSunoFormat(newDoc);
      onChange(newText);
    }
  }, [onChange, readOnly]);

  // Update section
  const handleSectionUpdate = useCallback((sectionId: string, updates: Partial<Section>) => {
    const newSections = document.sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    );
    handleDocumentChange({ ...document, sections: newSections });
  }, [document, handleDocumentChange]);

  // Delete section
  const handleSectionDelete = useCallback((sectionId: string) => {
    const newSections = document.sections.filter(s => s.id !== sectionId);
    handleDocumentChange({ ...document, sections: newSections });
  }, [document, handleDocumentChange]);

  // Add section
  const handleAddSection = useCallback(() => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      tags: [],
      lines: [],
      order: document.sections.length
    };
    handleDocumentChange({ 
      ...document, 
      sections: [...document.sections, newSection] 
    });
  }, [document, handleDocumentChange]);

  // Reorder sections
  const handleReorder = useCallback((newSections: Section[]) => {
    const reordered = newSections.map((s, i) => ({ ...s, order: i }));
    handleDocumentChange({ ...document, sections: reordered });
  }, [document, handleDocumentChange]);

  // Add tag to section
  const handleAddTag = useCallback((sectionId: string, tag: Tag) => {
    const section = document.sections.find(s => s.id === sectionId);
    if (section) {
      const newTags = [...section.tags, tag];
      handleSectionUpdate(sectionId, { tags: newTags });
    }
  }, [document.sections, handleSectionUpdate]);

  // Remove tag from section
  const handleRemoveTag = useCallback((sectionId: string, tagId: string) => {
    const section = document.sections.find(s => s.id === sectionId);
    if (section) {
      const newTags = section.tags.filter(t => t.id !== tagId);
      handleSectionUpdate(sectionId, { tags: newTags });
    }
  }, [document.sections, handleSectionUpdate]);

  // Update global tags
  const handleGlobalTagsChange = useCallback((newTags: Tag[]) => {
    handleDocumentChange({ ...document, globalTags: newTags });
  }, [document, handleDocumentChange]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <LyricsToolbar
        mode={mode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        editorMode={editorMode}
        onEditorModeChange={setEditorMode}
        stats={stats}
        lintIssues={lintIssues}
        showAITools={showAITools}
        onGenerate={onGenerate}
        onAddSection={handleAddSection}
        readOnly={readOnly}
        compact={compact}
      />

      <LyricsContent
        mode={mode}
        viewMode={viewMode}
        document={document}
        onDocumentChange={handleDocumentChange}
        onSectionUpdate={handleSectionUpdate}
        onSectionDelete={handleSectionDelete}
        onReorder={handleReorder}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onGlobalTagsChange={handleGlobalTagsChange}
        showTags={showTags}
        showSectionControls={showSectionControls}
        readOnly={readOnly}
        compact={compact}
      />
    </div>
  );
});

LyricsWorkspace.displayName = 'LyricsWorkspace';
