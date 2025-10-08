import { MusicStyle, StyleCategory } from './types';

export const electronicStyles: MusicStyle[] = [
  {
    id: 'house',
    name: 'House',
    category: StyleCategory.ELECTRONIC,
    description: '4/4 beat dance music with repetitive rhythms',
    tags: ['dance', 'club', '4/4', 'repetitive'],
    popularity: 9,
    relatedStyles: ['deep-house', 'tech-house', 'progressive-house'],
    tempo: '120-130 BPM',
    mood: ['energetic', 'uplifting', 'groovy']
  },
  {
    id: 'deep-house',
    name: 'Deep House',
    category: StyleCategory.ELECTRONIC,
    description: 'Soulful house with deep basslines and atmospheric sounds',
    tags: ['soulful', 'atmospheric', 'groovy'],
    popularity: 8,
    relatedStyles: ['house', 'tech-house'],
    tempo: '120-125 BPM',
    mood: ['chill', 'soulful', 'groovy']
  },
  {
    id: 'tech-house',
    name: 'Tech House',
    category: StyleCategory.ELECTRONIC,
    description: 'Fusion of house and techno with minimal elements',
    tags: ['minimal', 'groovy', 'dancefloor'],
    popularity: 8,
    relatedStyles: ['house', 'techno'],
    tempo: '125-130 BPM',
    mood: ['energetic', 'hypnotic', 'groovy']
  },
  {
    id: 'techno',
    name: 'Techno',
    category: StyleCategory.ELECTRONIC,
    description: 'Repetitive electronic music with driving beats',
    tags: ['industrial', 'repetitive', '4/4'],
    popularity: 8,
    relatedStyles: ['tech-house', 'minimal-techno'],
    tempo: '125-135 BPM',
    mood: ['dark', 'hypnotic', 'energetic']
  },
  {
    id: 'trance',
    name: 'Trance',
    category: StyleCategory.ELECTRONIC,
    description: 'Uplifting melodies with buildups and emotional breakdowns',
    tags: ['uplifting', 'melodic', 'euphoric'],
    popularity: 7,
    relatedStyles: ['progressive-trance', 'psytrance'],
    tempo: '130-140 BPM',
    mood: ['euphoric', 'uplifting', 'emotional']
  },
  {
    id: 'dubstep',
    name: 'Dubstep',
    category: StyleCategory.ELECTRONIC,
    description: 'Heavy bass and wobble sounds with syncopated rhythms',
    tags: ['bass', 'wobble', 'heavy'],
    popularity: 7,
    relatedStyles: ['drum-and-bass', 'trap'],
    tempo: '140 BPM (70 BPM half-time)',
    mood: ['aggressive', 'heavy', 'dark']
  },
  {
    id: 'drum-and-bass',
    name: 'Drum & Bass',
    category: StyleCategory.ELECTRONIC,
    description: 'Fast breakbeats with heavy bass',
    tags: ['breakbeat', 'bass', 'fast'],
    popularity: 7,
    relatedStyles: ['jungle', 'dubstep'],
    tempo: '160-180 BPM',
    mood: ['energetic', 'intense', 'rolling']
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    category: StyleCategory.ELECTRONIC,
    description: 'Retro 80s inspired electronic music',
    tags: ['retro', '80s', 'nostalgic', 'synth'],
    popularity: 8,
    relatedStyles: ['vaporwave', 'chillwave'],
    tempo: '100-120 BPM',
    mood: ['nostalgic', 'dreamy', 'cinematic']
  },
  {
    id: 'chillwave',
    name: 'Chillwave',
    category: StyleCategory.ELECTRONIC,
    description: 'Lo-fi electronic music with nostalgic vibes',
    tags: ['lo-fi', 'nostalgic', 'dreamy'],
    popularity: 7,
    relatedStyles: ['synthwave', 'vaporwave'],
    tempo: '80-110 BPM',
    mood: ['chill', 'nostalgic', 'dreamy']
  },
  {
    id: 'future-bass',
    name: 'Future Bass',
    category: StyleCategory.ELECTRONIC,
    description: 'Melodic bass music with bright synths and vocal chops',
    tags: ['melodic', 'bass', 'vocal-chops'],
    popularity: 8,
    relatedStyles: ['trap', 'dubstep'],
    tempo: '130-160 BPM',
    mood: ['uplifting', 'emotional', 'bright']
  },
  {
    id: 'hardstyle',
    name: 'Hardstyle',
    category: StyleCategory.ELECTRONIC,
    description: 'Hard kicks with euphoric melodies',
    tags: ['hard', 'kick', 'euphoric'],
    popularity: 6,
    relatedStyles: ['hardcore', 'techno'],
    tempo: '150-160 BPM',
    mood: ['aggressive', 'euphoric', 'energetic']
  },
  {
    id: 'psytrance',
    name: 'Psytrance',
    category: StyleCategory.ELECTRONIC,
    description: 'Psychedelic trance with hypnotic rhythms',
    tags: ['psychedelic', 'hypnotic', 'trippy'],
    popularity: 6,
    relatedStyles: ['goa-trance', 'progressive-trance'],
    tempo: '135-145 BPM',
    mood: ['psychedelic', 'hypnotic', 'energetic']
  },
  {
    id: 'minimal-techno',
    name: 'Minimal Techno',
    category: StyleCategory.ELECTRONIC,
    description: 'Stripped-down techno with subtle changes',
    tags: ['minimal', 'subtle', 'hypnotic'],
    popularity: 6,
    relatedStyles: ['techno', 'microhouse'],
    tempo: '125-130 BPM',
    mood: ['hypnotic', 'minimal', 'deep']
  },
  {
    id: 'breakbeat',
    name: 'Breakbeat',
    category: StyleCategory.ELECTRONIC,
    description: 'Syncopated drum patterns with electronic elements',
    tags: ['breaks', 'syncopated', 'funky'],
    popularity: 5,
    relatedStyles: ['drum-and-bass', 'jungle'],
    tempo: '120-140 BPM',
    mood: ['funky', 'energetic', 'groovy']
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    category: StyleCategory.ELECTRONIC,
    description: 'Slowed samples and nostalgic 90s aesthetics',
    tags: ['nostalgic', 'slowed', '90s', 'surreal'],
    popularity: 6,
    relatedStyles: ['chillwave', 'synthwave'],
    tempo: '60-90 BPM',
    mood: ['nostalgic', 'surreal', 'dreamy']
  },
  {
    id: 'glitch-hop',
    name: 'Glitch Hop',
    category: StyleCategory.ELECTRONIC,
    description: 'Hip-hop influenced electronic with glitchy sounds',
    tags: ['glitch', 'hip-hop', 'experimental'],
    popularity: 5,
    relatedStyles: ['downtempo', 'future-bass'],
    tempo: '80-110 BPM',
    mood: ['quirky', 'experimental', 'groovy']
  },

];
