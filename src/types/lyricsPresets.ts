/**
 * Lyrics Section Presets
 * Готовые пресеты секций для быстрого создания структуры песни
 */

export interface SectionPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultTags: string[];
  placeholderLines: string[];
  category: 'structure' | 'common' | 'special';
}

export const SECTION_PRESETS: SectionPreset[] = [
  // === STRUCTURE SECTIONS ===
  {
    id: 'intro',
    name: 'Intro',
    icon: 'play',
    description: 'Opening section that sets the mood',
    defaultTags: [],
    placeholderLines: ['Opening instrumental...', 'Or intro lyrics here'],
    category: 'structure'
  },
  {
    id: 'verse',
    name: 'Verse',
    icon: 'file-text',
    description: 'Main storytelling section',
    defaultTags: [],
    placeholderLines: ['First verse lyrics...', 'Tell your story here'],
    category: 'structure'
  },
  {
    id: 'verse-1',
    name: 'Verse 1',
    icon: 'file-text',
    description: 'First verse with specific numbering',
    defaultTags: [],
    placeholderLines: ['First verse lyrics...'],
    category: 'structure'
  },
  {
    id: 'verse-2',
    name: 'Verse 2',
    icon: 'file-text',
    description: 'Second verse',
    defaultTags: [],
    placeholderLines: ['Second verse lyrics...'],
    category: 'structure'
  },
  {
    id: 'pre-chorus',
    name: 'Pre-Chorus',
    icon: 'trending-up',
    description: 'Builds tension before the chorus',
    defaultTags: ['[Building Intensity]'],
    placeholderLines: ['Building up...', 'Leading to the hook'],
    category: 'structure'
  },
  {
    id: 'chorus',
    name: 'Chorus',
    icon: 'music',
    description: 'Main hook - the most memorable part',
    defaultTags: ['[Hook Emphasis]'],
    placeholderLines: ['Main hook here...', 'Most catchy part'],
    category: 'structure'
  },
  {
    id: 'post-chorus',
    name: 'Post-Chorus',
    icon: 'chevron-down',
    description: 'Extension after the chorus',
    defaultTags: [],
    placeholderLines: ['After chorus extension...'],
    category: 'structure'
  },
  {
    id: 'bridge',
    name: 'Bridge',
    icon: 'git-branch',
    description: 'Contrasting section, often emotional peak',
    defaultTags: ['[Climactic]'],
    placeholderLines: ['Bridge section...', 'Change in perspective or emotion'],
    category: 'structure'
  },
  {
    id: 'outro',
    name: 'Outro',
    icon: 'octagon',
    description: 'Closing section',
    defaultTags: [],
    placeholderLines: ['Ending...', 'Fade out or final statement'],
    category: 'structure'
  },

  // === COMMON SECTIONS ===
  {
    id: 'hook',
    name: 'Hook',
    icon: 'anchor',
    description: 'Catchy repeated element',
    defaultTags: ['[Hook Emphasis]'],
    placeholderLines: ['Catchy hook...'],
    category: 'common'
  },
  {
    id: 'breakdown',
    name: 'Breakdown',
    icon: 'minus-circle',
    description: 'Stripped-down section, minimal instrumentation',
    defaultTags: ['[Sparse]', '[Minimal]'],
    placeholderLines: ['Minimal section...'],
    category: 'common'
  },
  {
    id: 'build-up',
    name: 'Build-Up',
    icon: 'bar-chart-3',
    description: 'Gradually increasing intensity',
    defaultTags: ['[Building Intensity]', '[Riser]'],
    placeholderLines: ['Building up...', 'Increasing tension'],
    category: 'common'
  },
  {
    id: 'drop',
    name: 'Drop',
    icon: 'chevrons-down',
    description: 'Explosive release of energy (EDM/Electronic)',
    defaultTags: ['[Drop with Impact]'],
    placeholderLines: ['Drop section...'],
    category: 'common'
  },

  // === SPECIAL SECTIONS ===
  {
    id: 'instrumental',
    name: 'Instrumental',
    icon: 'music-2',
    description: 'Instrumental section without vocals',
    defaultTags: ['[Instrumental Only]'],
    placeholderLines: ['(Instrumental)'],
    category: 'special'
  },
  {
    id: 'solo',
    name: 'Solo',
    icon: 'guitar',
    description: 'Instrumental solo section',
    defaultTags: [],
    placeholderLines: ['[Guitar Solo]', 'Or [Piano Solo], [Saxophone Solo], etc.'],
    category: 'special'
  },
  {
    id: 'interlude',
    name: 'Interlude',
    icon: 'pause',
    description: 'Brief transitional section',
    defaultTags: [],
    placeholderLines: ['Transitional moment...'],
    category: 'special'
  },
  {
    id: 'rap-verse',
    name: 'Rap Verse',
    icon: 'mic',
    description: 'Rap/spoken word section',
    defaultTags: ['[Rap Verse]'],
    placeholderLines: ['Rap lyrics here...', 'Fast-paced rhymes'],
    category: 'special'
  },
  {
    id: 'ad-lib',
    name: 'Ad-lib',
    icon: 'sparkles',
    description: 'Improvised vocal flourishes',
    defaultTags: ['[Backing Vocals]'],
    placeholderLines: ['Oh yeah...', 'Vocal riffs and runs'],
    category: 'special'
  },
  {
    id: 'custom',
    name: 'Custom Section',
    icon: 'edit-3',
    description: 'Create your own section type',
    defaultTags: [],
    placeholderLines: ['Custom section content...'],
    category: 'special'
  }
];

/**
 * Popular song structure templates
 */
export interface StructureTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[]; // Array of preset IDs
}

export const STRUCTURE_TEMPLATES: StructureTemplate[] = [
  {
    id: 'pop-standard',
    name: 'Pop Standard',
    description: 'Classic pop song structure',
    sections: ['intro', 'verse-1', 'pre-chorus', 'chorus', 'verse-2', 'pre-chorus', 'chorus', 'bridge', 'chorus', 'outro']
  },
  {
    id: 'verse-chorus',
    name: 'Verse-Chorus',
    description: 'Simple verse-chorus alternation',
    sections: ['verse-1', 'chorus', 'verse-2', 'chorus', 'bridge', 'chorus']
  },
  {
    id: 'edm-structure',
    name: 'EDM/Electronic',
    description: 'Electronic dance music structure',
    sections: ['intro', 'build-up', 'drop', 'breakdown', 'build-up', 'drop', 'outro']
  },
  {
    id: 'rap-hip-hop',
    name: 'Rap/Hip-Hop',
    description: 'Typical hip-hop structure',
    sections: ['intro', 'verse-1', 'hook', 'verse-2', 'hook', 'bridge', 'hook', 'outro']
  },
  {
    id: 'ballad',
    name: 'Ballad',
    description: 'Emotional ballad structure',
    sections: ['intro', 'verse-1', 'verse-2', 'chorus', 'instrumental', 'bridge', 'chorus', 'outro']
  }
];
