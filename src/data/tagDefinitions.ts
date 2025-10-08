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
    description: 'Song structure sections',
    values: [
      'Intro', 'Verse', 'Verse 1', 'Verse 2', 'Verse 3',
      'Pre-Chorus', 'Chorus', 'Post-Chorus',
      'Bridge', 'Breakdown', 'Build-Up', 'Drop',
      'Hook', 'Instrumental', 'Solo', 'Outro', 'Interlude'
    ]
  },

  // 🎤 VOCAL TAGS
  vocal: {
    category: 'vocal',
    icon: 'mic',
    color: 'bg-purple-500',
    description: 'Vocal styles and characteristics',
    values: [
      // Types
      'Lead Vocal', 'Backing Vocals', 'Stacked Harmonies',
      'Call-and-Response', 'Duet', 'Choir', 'Spoken Word', 'Rap Verse',
      // Tone/Texture
      'Gritty', 'Husky', 'Breathy', 'Soulful', 'Belting',
      'Falsetto', 'Whisper', 'Raspy', 'Smooth', 'Powerful',
      // FX
      'Light Autotune', 'Heavy Autotune', 'Vocoder',
      'Double-Tracked', 'Lo-fi Vocal', 'Pitched Up', 'Pitched Down'
    ],
    examples: ['[Lead Vocal]', '[Gritty]', '[Light Autotune]']
  },

  // 💫 EMOTION TAGS
  emotion: {
    category: 'emotion',
    icon: 'sparkles',
    color: 'bg-pink-500',
    description: 'Emotional atmosphere and mood',
    values: [
      'Melancholic', 'Euphoric', 'Aggressive', 'Dreamy',
      'Bittersweet', 'Triumphant', 'Dark', 'Hopeful',
      'Haunting', 'Nostalgic', 'Energetic', 'Calm',
      'Romantic', 'Epic', 'Intimate', 'Mysterious'
    ],
    examples: ['[Melancholic]', '[Euphoric]', '[Dreamy]']
  },

  // 🎹 INSTRUMENT TAGS
  instrument: {
    category: 'instrument',
    icon: 'piano',
    color: 'bg-green-500',
    description: 'Musical instruments and sounds',
    values: [
      // Rhythm
      'Drum Machine', 'Acoustic Drums', 'Breakbeat', 'Trap Hats',
      'Four-on-the-Floor', '808 Sub', 'Fuzzy Bass', 'Slap Bass',
      // Harmony/Melody
      'Piano', 'Rhodes', 'Organ', 'Acoustic Guitar', 'Electric Guitar Clean',
      'Electric Guitar Crunch', 'Strings', 'Brass', 'Saxophone', 'Accordion',
      'Violin', 'Cello', 'Flute', 'Trumpet',
      // Synth/Textures
      'Analog Pad', 'Ethereal Pad', 'Pluck Synth', 'Arp Synth',
      'FM Keys', 'Chiptune Lead', 'Supersaw', 'Warm Bass'
    ],
    examples: ['[Piano]', '[808 Sub]', '[Analog Pad]']
  },

  // 🧭 ARRANGEMENT TAGS
  arrangement: {
    category: 'arrangement',
    icon: 'layers',
    color: 'bg-orange-500',
    description: 'Musical arrangement and structure',
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
    description: 'Audio effects and mixing',
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
    description: 'Tempo and rhythm characteristics',
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
    description: 'Musical key and tonality',
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
    description: 'Language and vocal content',
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
    description: 'Content type and emphasis',
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
    description: 'Mix and master settings',
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
