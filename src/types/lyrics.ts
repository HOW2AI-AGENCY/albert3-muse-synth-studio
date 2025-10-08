/**
 * Lyrics Editor Type Definitions
 * Система типов для редактора лирики с тегами
 */

export type TagCategory = 
  | "section"        // [Intro], [Verse], [Chorus]
  | "vocal"          // [Lead Vocal], [Gritty], [Autotune]
  | "emotion"        // [Melancholic], [Euphoric]
  | "instrument"     // [Piano], [808 Sub], [Analog Pad]
  | "arrangement"    // [Sparse], [Building Intensity]
  | "fx"             // [Reverb Heavy], [Delay]
  | "tempo"          // [Tempo: 120 BPM]
  | "key"            // [Key: C minor]
  | "language"       // [Language: English]
  | "content"        // [Clean Lyrics], [Instrumental Only]
  | "meta";          // [Mix: punchy], [Master: loud]

export interface Tag {
  id: string;
  category: TagCategory;
  value: string;           // "Chorus", "Gritty", "Piano"
  raw: string;             // "[Chorus]", "[Gritty]", "[Piano]"
  icon?: string;           // lucide icon name
  color?: string;          // badge color
  description?: string;    // tooltip text
}

export interface Section {
  id: string;
  title: string;           // "Verse 1", "Chorus"
  tags: Tag[];             // non-section tags attached to this section
  lines: string[];         // lyric lines
  order: number;
  isCollapsed?: boolean;
}

export interface SongDocument {
  id: string;
  globalTags: Tag[];       // Key/Tempo/Genre at top
  sections: Section[];
  providerHints?: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagDefinition {
  category: TagCategory;
  values: string[];
  icon: string;
  color: string;
  description: string;
  examples?: string[];
}

export interface LyricsPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  globalTags: string[];
  sections: {
    title: string;
    tags: string[];
    linesPlaceholder: string[];
  }[];
}

export interface LintIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  sectionId?: string;
  tagId?: string;
  suggestion?: string;
}

export interface ReferenceAnalysis {
  tempo: number;
  key: string;
  loudness: number;
  spectralCentroid: number;
  energy: number;
  suggestedTags: string[];
  genre?: string;
  mood?: string;
}

export type EditorMode = 'scratch' | 'ai-suggest' | 'edit-existing' | 'reference';
