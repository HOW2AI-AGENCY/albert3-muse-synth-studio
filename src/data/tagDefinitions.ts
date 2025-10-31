import { TagDefinition } from '@/types/lyrics';

/**
 * Tag Definitions Database
 * Полная база тегов для Suno AI с иконками и описаниями
 */

export const TAG_DEFINITIONS: Record<string, TagDefinition> = {
  // 🎭 SECTION TAGS
  section: {
    category: 'section',
    icon: 'layout',
    color: 'bg-blue-500',
    description: 'Структурные секции композиции',
    values: [
      'Intro', 'Verse', 'Verse 1', 'Verse 2', 'Verse 3',
      'Pre-Chorus', 'Chorus', 'Post-Chorus',
      'Bridge', 'Breakdown', 'Build-Up', 'Drop',
      'Hook', 'Instrumental', 'Solo', 'Outro', 'Interlude'
    ]
  },

  // 🎤 VOCAL TAGS (Updated for Suno v4.5/v5)
  vocal: {
    category: 'vocal',
    icon: 'mic',
    color: 'bg-purple-500',
    description: 'Стили и характеристики вокала (оптимизировано для Suno v5)',
    values: [
      // Types
      'Lead Vocal', 'Backing Vocals', 'Stacked Harmonies',
      'Call-and-Response', 'Duet', 'Choir', 'Spoken Word', 'Rap Verse',
      'Acapella', 'Humming', 'Whistle', 'Scat Singing',
      // Tone/Texture (v5 Enhanced)
      'Gritty', 'Husky', 'Breathy', 'Soulful', 'Belting',
      'Falsetto', 'Whisper', 'Raspy', 'Smooth', 'Powerful',
      'Melancholic Vocal', 'Euphoric Vocal', 'Intimate Vocal',
      'Dark Vocal', 'Angelic', 'Raw Emotion', 'Operatic',
      // Gender/Age
      'Male Vocals', 'Female Vocals', 'Child Voice', 'Elderly Voice',
      'Deep Voice', 'High Pitched', 'Androgynous',
      // FX
      'Light Autotune', 'Heavy Autotune', 'Vocoder',
      'Double-Tracked', 'Lo-fi Vocal', 'Pitched Up', 'Pitched Down',
      'Reverb Vocal', 'Delay Vocal', 'Distorted Vocal'
    ],
    examples: ['[Lead Vocal]', '[Gritty]', '[Light Autotune]', '[Female Vocals]']
  },

  // 💫 EMOTION TAGS
  emotion: {
    category: 'emotion',
    icon: 'sparkles',
    color: 'bg-pink-500',
    description: 'Эмоциональная атмосфера и настроение',
    values: [
      'Melancholic', 'Euphoric', 'Aggressive', 'Dreamy',
      'Bittersweet', 'Triumphant', 'Dark', 'Hopeful',
      'Haunting', 'Nostalgic', 'Energetic', 'Calm',
      'Romantic', 'Epic', 'Intimate', 'Mysterious'
    ],
    examples: ['[Melancholic]', '[Euphoric]', '[Dreamy]']
  },

  // 🎹 INSTRUMENT TAGS (Extended for Suno v4.5/v5)
  instrument: {
    category: 'instrument',
    icon: 'piano',
    color: 'bg-green-500',
    description: 'Музыкальные инструменты и звуки (расширенная коллекция)',
    values: [
      // Rhythm Section
      'Drum Machine', 'Acoustic Drums', 'Breakbeat', 'Trap Hats',
      'Four-on-the-Floor', 'Live Drums', 'Drum & Bass', 'Tribal Drums',
      '808 Sub', 'Fuzzy Bass', 'Slap Bass', 'Synth Bass', 'Upright Bass',
      'Kick Drum', 'Snare', 'Hi-Hats', 'Clap',
      // Keys & Piano
      'Piano', 'Rhodes', 'Organ', 'Hammond Organ', 'Wurlitzer',
      'Electric Piano', 'Grand Piano', 'Upright Piano',
      // Guitars
      'Acoustic Guitar', 'Electric Guitar Clean', 'Electric Guitar Crunch',
      'Electric Guitar Distorted', 'Guitar Riff', 'Guitar Solo',
      'Fingerpicked Guitar', 'Strummed Guitar', 'Bass Guitar',
      // Orchestral
      'Strings', 'Brass', 'Woodwinds', 'Orchestra',
      'Violin', 'Cello', 'Viola', 'Double Bass',
      'Saxophone', 'Trumpet', 'Trombone', 'French Horn',
      'Flute', 'Clarinet', 'Oboe', 'Bassoon',
      // World Instruments
      'Accordion', 'Sitar', 'Banjo', 'Mandolin', 'Ukulele',
      'Harp', 'Harmonica', 'Bagpipes', 'Steel Drum',
      // Synths (v5 Enhanced)
      'Analog Pad', 'Ethereal Pad', 'Warm Pad', 'Dark Pad',
      'Pluck Synth', 'Arp Synth', 'Lead Synth', 'Bass Synth',
      'FM Keys', 'FM Bass', 'Chiptune Lead', '8-bit',
      'Supersaw', 'Warm Bass', 'Sub Bass', 'Reese Bass'
    ],
    examples: ['[Piano]', '[808 Sub]', '[Analog Pad]', '[Guitar Riff]']
  },

  // 🧭 ARRANGEMENT TAGS
  arrangement: {
    category: 'arrangement',
    icon: 'layers',
    color: 'bg-orange-500',
    description: 'Музыкальная аранжировка и структура',
    values: [
      'Sparse', 'Minimal', 'Layered', 'Building Intensity',
      'Climactic', 'Orchestral Build', 'Drop with Impact',
      'Stop-Time Bar', 'Riser', 'Sweep Down', 'Gradual Build',
      'Dynamic Shift', 'Call and Response'
    ],
    examples: ['[Building Intensity]', '[Drop with Impact]']
  },

  // 🎛️ FX/MIX TAGS
  fx: {
    category: 'fx',
    icon: 'sliders-horizontal',
    color: 'bg-cyan-500',
    description: 'Аудиоэффекты и сведение',
    values: [
      // Reverb
      'Reverb Heavy', 'Short Plate Reverb', 'Hall Reverb', 'Room Reverb',
      // Delay
      'Delay: dotted 1/4', 'Ping-Pong Delay', 'Tape Delay',
      // Saturation/Distortion
      'Tape Saturation', 'Bitcrushed', 'Warm Saturation', 'Tube Warmth',
      // Spatial
      'Sidechain Pump', 'Vinyl Crackle', 'Stutter FX', 'Datamosh',
      'Glitch', 'Stereo Wide', 'Mono-Focused'
    ],
    examples: ['[Reverb Heavy]', '[Sidechain Pump]', '[Vinyl Crackle]']
  },

  // ⏱️ TEMPO TAGS
  tempo: {
    category: 'tempo',
    icon: 'gauge',
    color: 'bg-yellow-500',
    description: 'Темп и ритмические характеристики',
    values: [
      'Tempo: 60 BPM', 'Tempo: 80 BPM', 'Tempo: 90 BPM',
      'Tempo: 100 BPM', 'Tempo: 110 BPM', 'Tempo: 120 BPM',
      'Tempo: 128 BPM', 'Tempo: 140 BPM', 'Tempo: 150 BPM',
      'Tempo: 160 BPM', 'Tempo: 174 BPM', 'Tempo: 180 BPM',
      'Swing: light', 'Swing: heavy', 'Syncopated'
    ],
    examples: ['[Tempo: 120 BPM]', '[Swing: light]']
  },

  // ♭ KEY TAGS
  key: {
    category: 'key',
    icon: 'music',
    color: 'bg-indigo-500',
    description: 'Музыкальная тональность и лад',
    values: [
      // Major keys
      'Key: C major', 'Key: D major', 'Key: E major', 'Key: F major',
      'Key: G major', 'Key: A major', 'Key: B major',
      // Minor keys
      'Key: C minor', 'Key: D minor', 'Key: E minor', 'Key: F minor',
      'Key: G minor', 'Key: A minor', 'Key: B minor',
      // Modes
      'Dorian', 'Phrygian', 'Lydian', 'Mixolydian'
    ],
    examples: ['[Key: C minor]', '[Key: A major]']
  },

  // 🌐 LANGUAGE TAGS
  language: {
    category: 'language',
    icon: 'globe',
    color: 'bg-teal-500',
    description: 'Язык вокального контента',
    values: [
      'Language: English', 'Language: Russian', 'Language: Spanish',
      'Language: French', 'Language: German', 'Language: Japanese',
      'Language: Korean', 'Language: Thai', 'Language: Hindi'
    ],
    examples: ['[Language: English]', '[Language: Russian]']
  },

  // 📝 CONTENT TAGS
  content: {
    category: 'content',
    icon: 'file-text',
    color: 'bg-gray-500',
    description: 'Тип контента и акценты',
    values: [
      'Clean Lyrics', 'Instrumental Only', 'Hook Emphasis',
      'Verse Focus', 'Melodic Focus', 'Lyric Focus'
    ],
    examples: ['[Instrumental Only]', '[Hook Emphasis]']
  },

  // 🎚️ META TAGS
  meta: {
    category: 'meta',
    icon: 'settings',
    color: 'bg-slate-500',
    description: 'Настройки сведения и мастеринга',
    values: [
      'Mix: punchy', 'Mix: wide', 'Mix: warm', 'Mix: bright',
      'Master: loud but dynamic', 'Master: transparent',
      'Master: vintage', 'Master: modern'
    ],
    examples: ['[Mix: punchy]', '[Master: loud but dynamic]']
  }
};

// Quick access для иконок по категориям
export const CATEGORY_ICONS = {
  section: 'layout',
  vocal: 'mic',
  emotion: 'sparkles',
  instrument: 'piano',
  arrangement: 'layers',
  fx: 'sliders-horizontal',
  tempo: 'gauge',
  key: 'music',
  language: 'globe',
  content: 'file-text',
  meta: 'settings'
} as const;

// Цвета по категориям
export const CATEGORY_COLORS = {
  section: 'bg-blue-500 text-white',
  vocal: 'bg-purple-500 text-white',
  emotion: 'bg-pink-500 text-white',
  instrument: 'bg-green-500 text-white',
  arrangement: 'bg-orange-500 text-white',
  fx: 'bg-cyan-500 text-white',
  tempo: 'bg-yellow-500 text-white',
  key: 'bg-indigo-500 text-white',
  language: 'bg-teal-500 text-white',
  content: 'bg-gray-500 text-white',
  meta: 'bg-slate-500 text-white'
} as const;
