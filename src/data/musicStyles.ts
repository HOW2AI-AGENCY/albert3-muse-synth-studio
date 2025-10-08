/**
 * Comprehensive music styles database
 * 70+ music genres across 8 main categories
 */

export enum StyleCategory {
  ELECTRONIC = 'electronic',
  ROCK = 'rock',
  HIP_HOP = 'hip-hop',
  JAZZ = 'jazz',
  CLASSICAL = 'classical',
  WORLD = 'world',
  AMBIENT = 'ambient',
  EXPERIMENTAL = 'experimental'
}

export interface MusicStyle {
  id: string;
  name: string;
  category: StyleCategory;
  description: string;
  tags: string[];
  popularity: number; // 1-10 scale
  relatedStyles: string[];
  tempo?: string; // BPM range
  mood?: string[];
}

export const MUSIC_STYLES: MusicStyle[] = [
  // ELECTRONIC (16 styles)
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

  // ROCK (12 styles)
  {
    id: 'classic-rock',
    name: 'Classic Rock',
    category: StyleCategory.ROCK,
    description: 'Timeless rock with guitar riffs and strong vocals',
    tags: ['guitar', 'riffs', 'timeless'],
    popularity: 9,
    relatedStyles: ['hard-rock', 'blues-rock'],
    tempo: '100-130 BPM',
    mood: ['energetic', 'powerful', 'rebellious']
  },
  {
    id: 'indie-rock',
    name: 'Indie Rock',
    category: StyleCategory.ROCK,
    description: 'Alternative rock with artistic and creative approach',
    tags: ['alternative', 'artistic', 'creative'],
    popularity: 8,
    relatedStyles: ['alternative-rock', 'post-punk'],
    tempo: '110-140 BPM',
    mood: ['introspective', 'artistic', 'energetic']
  },
  {
    id: 'punk',
    name: 'Punk Rock',
    category: StyleCategory.ROCK,
    description: 'Fast, aggressive rock with DIY ethos',
    tags: ['fast', 'aggressive', 'rebellious'],
    popularity: 7,
    relatedStyles: ['hardcore-punk', 'post-punk'],
    tempo: '140-180 BPM',
    mood: ['rebellious', 'aggressive', 'raw']
  },
  {
    id: 'metal',
    name: 'Metal',
    category: StyleCategory.ROCK,
    description: 'Heavy distorted guitars with powerful vocals',
    tags: ['heavy', 'distorted', 'powerful'],
    popularity: 8,
    relatedStyles: ['thrash-metal', 'death-metal'],
    tempo: '120-160 BPM',
    mood: ['aggressive', 'powerful', 'dark']
  },
  {
    id: 'grunge',
    name: 'Grunge',
    category: StyleCategory.ROCK,
    description: 'Raw alternative rock from Seattle scene',
    tags: ['raw', 'alternative', 'distorted'],
    popularity: 7,
    relatedStyles: ['alternative-rock', 'punk'],
    tempo: '100-130 BPM',
    mood: ['angsty', 'raw', 'melancholic']
  },
  {
    id: 'progressive-rock',
    name: 'Progressive Rock',
    category: StyleCategory.ROCK,
    description: 'Complex compositions with experimental elements',
    tags: ['complex', 'experimental', 'instrumental'],
    popularity: 6,
    relatedStyles: ['art-rock', 'psychedelic-rock'],
    tempo: '60-140 BPM (variable)',
    mood: ['complex', 'epic', 'experimental']
  },
  {
    id: 'hard-rock',
    name: 'Hard Rock',
    category: StyleCategory.ROCK,
    description: 'Aggressive rock with heavy guitar riffs',
    tags: ['heavy', 'aggressive', 'riffs'],
    popularity: 8,
    relatedStyles: ['metal', 'classic-rock'],
    tempo: '110-140 BPM',
    mood: ['powerful', 'aggressive', 'energetic']
  },
  {
    id: 'alternative-rock',
    name: 'Alternative Rock',
    category: StyleCategory.ROCK,
    description: 'Non-mainstream rock with diverse influences',
    tags: ['alternative', 'diverse', 'modern'],
    popularity: 8,
    relatedStyles: ['indie-rock', 'grunge'],
    tempo: '100-140 BPM',
    mood: ['varied', 'modern', 'creative']
  },
  {
    id: 'psychedelic-rock',
    name: 'Psychedelic Rock',
    category: StyleCategory.ROCK,
    description: 'Experimental rock with surreal elements',
    tags: ['experimental', 'surreal', 'trippy'],
    popularity: 6,
    relatedStyles: ['progressive-rock', 'garage-rock'],
    tempo: '90-130 BPM',
    mood: ['psychedelic', 'trippy', 'experimental']
  },
  {
    id: 'post-rock',
    name: 'Post-Rock',
    category: StyleCategory.ROCK,
    description: 'Instrumental rock with atmospheric buildups',
    tags: ['instrumental', 'atmospheric', 'cinematic'],
    popularity: 6,
    relatedStyles: ['shoegaze', 'ambient'],
    tempo: '80-120 BPM',
    mood: ['atmospheric', 'cinematic', 'emotional']
  },
  {
    id: 'garage-rock',
    name: 'Garage Rock',
    category: StyleCategory.ROCK,
    description: 'Raw, energetic rock with lo-fi production',
    tags: ['raw', 'lo-fi', 'energetic'],
    popularity: 5,
    relatedStyles: ['punk', 'indie-rock'],
    tempo: '120-160 BPM',
    mood: ['raw', 'energetic', 'rebellious']
  },
  {
    id: 'shoegaze',
    name: 'Shoegaze',
    category: StyleCategory.ROCK,
    description: 'Ethereal vocals with walls of distorted guitar',
    tags: ['ethereal', 'distorted', 'dreamy'],
    popularity: 5,
    relatedStyles: ['dream-pop', 'post-rock'],
    tempo: '90-120 BPM',
    mood: ['dreamy', 'ethereal', 'atmospheric']
  },

  // HIP-HOP (10 styles)
  {
    id: 'trap',
    name: 'Trap',
    category: StyleCategory.HIP_HOP,
    description: 'Modern hip-hop with 808s and hi-hats',
    tags: ['808', 'hi-hats', 'modern'],
    popularity: 9,
    relatedStyles: ['drill', 'future-bass'],
    tempo: '130-170 BPM',
    mood: ['aggressive', 'modern', 'heavy']
  },
  {
    id: 'boom-bap',
    name: 'Boom Bap',
    category: StyleCategory.HIP_HOP,
    description: 'Classic hip-hop with punchy drums',
    tags: ['classic', 'punchy', 'drums'],
    popularity: 7,
    relatedStyles: ['golden-age-hip-hop', 'jazz-hop'],
    tempo: '85-95 BPM',
    mood: ['nostalgic', 'gritty', 'classic']
  },
  {
    id: 'lo-fi-hip-hop',
    name: 'Lo-Fi Hip-Hop',
    category: StyleCategory.HIP_HOP,
    description: 'Chill beats with vinyl crackle and jazz samples',
    tags: ['chill', 'jazz', 'vinyl', 'study'],
    popularity: 9,
    relatedStyles: ['jazz-hop', 'chillhop'],
    tempo: '70-90 BPM',
    mood: ['chill', 'nostalgic', 'relaxing']
  },
  {
    id: 'drill',
    name: 'Drill',
    category: StyleCategory.HIP_HOP,
    description: 'Dark, aggressive hip-hop with sliding 808s',
    tags: ['dark', 'aggressive', '808s'],
    popularity: 8,
    relatedStyles: ['trap', 'grime'],
    tempo: '140-160 BPM',
    mood: ['dark', 'aggressive', 'menacing']
  },
  {
    id: 'jazz-hop',
    name: 'Jazz-Hop',
    category: StyleCategory.HIP_HOP,
    description: 'Jazz-influenced hip-hop with smooth samples',
    tags: ['jazz', 'smooth', 'samples'],
    popularity: 7,
    relatedStyles: ['lo-fi-hip-hop', 'boom-bap'],
    tempo: '80-100 BPM',
    mood: ['smooth', 'sophisticated', 'chill']
  },
  {
    id: 'conscious-rap',
    name: 'Conscious Rap',
    category: StyleCategory.HIP_HOP,
    description: 'Socially aware hip-hop with meaningful lyrics',
    tags: ['conscious', 'lyrical', 'meaningful'],
    popularity: 6,
    relatedStyles: ['boom-bap', 'alternative-hip-hop'],
    tempo: '85-100 BPM',
    mood: ['thoughtful', 'serious', 'powerful']
  },
  {
    id: 'cloud-rap',
    name: 'Cloud Rap',
    category: StyleCategory.HIP_HOP,
    description: 'Atmospheric hip-hop with ethereal production',
    tags: ['atmospheric', 'ethereal', 'dreamy'],
    popularity: 6,
    relatedStyles: ['emo-rap', 'trap'],
    tempo: '60-90 BPM',
    mood: ['dreamy', 'melancholic', 'atmospheric']
  },
  {
    id: 'emo-rap',
    name: 'Emo Rap',
    category: StyleCategory.HIP_HOP,
    description: 'Emotional rap with rock influences',
    tags: ['emotional', 'rock', 'melodic'],
    popularity: 7,
    relatedStyles: ['cloud-rap', 'alternative-hip-hop'],
    tempo: '75-120 BPM',
    mood: ['emotional', 'melancholic', 'introspective']
  },
  {
    id: 'grime',
    name: 'Grime',
    category: StyleCategory.HIP_HOP,
    description: 'UK hip-hop with electronic influences',
    tags: ['uk', 'electronic', 'aggressive'],
    popularity: 6,
    relatedStyles: ['drill', 'garage'],
    tempo: '130-145 BPM',
    mood: ['aggressive', 'gritty', 'energetic']
  },
  {
    id: 'phonk',
    name: 'Phonk',
    category: StyleCategory.HIP_HOP,
    description: 'Memphis rap influenced with lo-fi aesthetics',
    tags: ['memphis', 'lo-fi', 'dark'],
    popularity: 7,
    relatedStyles: ['trap', 'cloud-rap'],
    tempo: '130-160 BPM',
    mood: ['dark', 'hypnotic', 'nostalgic']
  },

  // JAZZ (8 styles)
  {
    id: 'smooth-jazz',
    name: 'Smooth Jazz',
    category: StyleCategory.JAZZ,
    description: 'Relaxed jazz with smooth melodies and grooves',
    tags: ['relaxed', 'melodic', 'groovy'],
    popularity: 7,
    relatedStyles: ['jazz-funk', 'fusion'],
    tempo: '70-100 BPM',
    mood: ['smooth', 'relaxed', 'cool']
  },
  {
    id: 'bebop',
    name: 'Bebop',
    category: StyleCategory.JAZZ,
    description: 'Fast-paced jazz with complex chord changes',
    tags: ['fast', 'complex', 'improvisation'],
    popularity: 6,
    relatedStyles: ['hard-bop', 'post-bop'],
    tempo: '140-180 BPM',
    mood: ['energetic', 'complex', 'intense']
  },
  {
    id: 'fusion',
    name: 'Fusion',
    category: StyleCategory.JAZZ,
    description: 'Blend of jazz with rock, funk, and R&B',
    tags: ['blend', 'rock', 'funk'],
    popularity: 7,
    relatedStyles: ['smooth-jazz', 'jazz-funk'],
    tempo: '90-130 BPM',
    mood: ['energetic', 'groovy', 'experimental']
  },
  {
    id: 'jazz-funk',
    name: 'Jazz-Funk',
    category: StyleCategory.JAZZ,
    description: 'Funky rhythms with jazz improvisation',
    tags: ['funky', 'groovy', 'improvisation'],
    popularity: 6,
    relatedStyles: ['fusion', 'smooth-jazz'],
    tempo: '90-120 BPM',
    mood: ['funky', 'groovy', 'energetic']
  },
  {
    id: 'swing',
    name: 'Swing',
    category: StyleCategory.JAZZ,
    description: 'Big band jazz with swinging rhythms',
    tags: ['big-band', 'swing', 'dance'],
    popularity: 6,
    relatedStyles: ['traditional-jazz', 'dixieland'],
    tempo: '110-140 BPM',
    mood: ['danceable', 'upbeat', 'joyful']
  },
  {
    id: 'cool-jazz',
    name: 'Cool Jazz',
    category: StyleCategory.JAZZ,
    description: 'Relaxed and smooth jazz style',
    tags: ['relaxed', 'smooth', 'melodic'],
    popularity: 6,
    relatedStyles: ['bebop', 'modal-jazz'],
    tempo: '80-110 BPM',
    mood: ['cool', 'relaxed', 'laid-back']
  },
  {
    id: 'modal-jazz',
    name: 'Modal Jazz',
    category: StyleCategory.JAZZ,
    description: 'Jazz based on modal scales',
    tags: ['modal', 'improvisation', 'experimental'],
    popularity: 5,
    relatedStyles: ['bebop', 'cool-jazz'],
    tempo: '90-130 BPM',
    mood: ['experimental', 'complex', 'introspective']
  },
  {
    id: 'free-jazz',
    name: 'Free Jazz',
    category: StyleCategory.JAZZ,
    description: 'Avant-garde jazz with free improvisation',
    tags: ['avant-garde', 'improvisation', 'experimental'],
    popularity: 4,
    relatedStyles: ['free-improvisation', 'experimental'],
    tempo: 'variable',
    mood: ['experimental', 'chaotic', 'intense']
  },

  // CLASSICAL (6 styles)
  {
    id: 'baroque',
    name: 'Baroque',
    category: StyleCategory.CLASSICAL,
    description: 'Ornate and elaborate classical music from 1600-1750',
    tags: ['ornate', 'elaborate', 'historical'],
    popularity: 7,
    relatedStyles: ['classical', 'romantic'],
    tempo: 'variable',
    mood: ['formal', 'complex', 'structured']
  },
  {
    id: 'classical',
    name: 'Classical',
    category: StyleCategory.CLASSICAL,
    description: 'Classical period music from 1750-1820',
    tags: ['structured', 'formal', 'orchestral'],
    popularity: 8,
    relatedStyles: ['baroque', 'romantic'],
    tempo: 'variable',
    mood: ['formal', 'balanced', 'elegant']
  },
  {
    id: 'romantic',
    name: 'Romantic',
    category: StyleCategory.CLASSICAL,
    description: 'Expressive and emotional classical music from 1820-1910',
    tags: ['expressive', 'emotional', 'orchestral'],
    popularity: 7,
    relatedStyles: ['classical', 'modern'],
    tempo: 'variable',
    mood: ['emotional', 'dramatic', 'passionate']
  },
  {
    id: 'modern',
    name: 'Modern Classical',
    category: StyleCategory.CLASSICAL,
    description: '20th century and contemporary classical music',
    tags: ['contemporary', 'experimental', 'orchestral'],
    popularity: 6,
    relatedStyles: ['romantic', 'avant-garde'],
    tempo: 'variable',
    mood: ['experimental', 'complex', 'varied']
  },
  {
    id: 'avant-garde',
    name: 'Avant-Garde',
    category: StyleCategory.CLASSICAL,
    description: 'Experimental and unconventional classical music',
    tags: ['experimental', 'unconventional', 'modern'],
    popularity: 5,
    relatedStyles: ['modern', 'free-jazz'],
    tempo: 'variable',
    mood: ['experimental', 'challenging', 'abstract']
  },
  {
    id: 'minimalism',
    name: 'Minimalism',
    category: StyleCategory.CLASSICAL,
    description: 'Repetitive and gradual classical music style',
    tags: ['repetitive', 'gradual', 'modern'],
    popularity: 6,
    relatedStyles: ['modern', 'ambient'],
    tempo: 'variable',
    mood: ['hypnotic', 'calm', 'meditative']
  },

  // WORLD (6 styles)
  {
    id: 'latin',
    name: 'Latin',
    category: StyleCategory.WORLD,
    description: 'Rhythmic and danceable music from Latin America',
    tags: ['rhythmic', 'dance', 'latin'],
    popularity: 8,
    relatedStyles: ['salsa', 'bossa-nova'],
    tempo: '90-130 BPM',
    mood: ['energetic', 'festive', 'passionate']
  },
  {
    id: 'african',
    name: 'African',
    category: StyleCategory.WORLD,
    description: 'Traditional and modern music from Africa',
    tags: ['traditional', 'rhythmic', 'percussion'],
    popularity: 7,
    relatedStyles: ['highlife', 'afrobeat'],
    tempo: 'variable',
    mood: ['rhythmic', 'energetic', 'spiritual']
  },
  {
    id: 'asian',
    name: 'Asian',
    category: StyleCategory.WORLD,
    description: 'Traditional and contemporary music from Asia',
    tags: ['traditional', 'melodic', 'cultural'],
    popularity: 6,
    relatedStyles: ['k-pop', 'j-pop'],
    tempo: 'variable',
    mood: ['melodic', 'cultural', 'varied']
  },
  {
    id: 'reggae',
    name: 'Reggae',
    category: StyleCategory.WORLD,
    description: 'Jamaican music with offbeat rhythms and social lyrics',
    tags: ['offbeat', 'social', 'laid-back'],
    popularity: 7,
    relatedStyles: ['ska', 'dub'],
    tempo: '70-90 BPM',
    mood: ['laid-back', 'positive', 'groovy']
  },
  {
    id: 'flamenco',
    name: 'Flamenco',
    category: StyleCategory.WORLD,
    description: 'Spanish folk music with guitar and passionate vocals',
    tags: ['spanish', 'guitar', 'passionate'],
    popularity: 6,
    relatedStyles: ['latin', 'folk'],
    tempo: 'variable',
    mood: ['passionate', 'emotional', 'intense']
  },
  {
    id: 'celtic',
    name: 'Celtic',
    category: StyleCategory.WORLD,
    description: 'Traditional music from Celtic regions',
    tags: ['traditional', 'folk', 'melodic'],
    popularity: 5,
    relatedStyles: ['folk', 'world'],
    tempo: 'variable',
    mood: ['melodic', 'traditional', 'uplifting']
  },

  // AMBIENT (5 styles)
  {
    id: 'ambient',
    name: 'Ambient',
    category: StyleCategory.AMBIENT,
    description: 'Atmospheric music with focus on tone and mood',
    tags: ['atmospheric', 'tone', 'mood'],
    popularity: 7,
    relatedStyles: ['drone', 'chillout'],
    tempo: 'slow',
    mood: ['calm', 'meditative', 'ethereal']
  },
  {
    id: 'chillout',
    name: 'Chillout',
    category: StyleCategory.AMBIENT,
    description: 'Relaxed electronic music for chilling',
    tags: ['relaxed', 'electronic', 'downtempo'],
    popularity: 7,
    relatedStyles: ['ambient', 'downtempo'],
    tempo: 'slow',
    mood: ['relaxed', 'calm', 'peaceful']
  },
  {
    id: 'drone',
    name: 'Drone',
    category: StyleCategory.AMBIENT,
    description: 'Sustained tones and minimal harmonic changes',
    tags: ['sustained', 'minimal', 'experimental'],
    popularity: 5,
    relatedStyles: ['ambient', 'experimental'],
    tempo: 'very slow',
    mood: ['hypnotic', 'minimal', 'meditative']
  },
  {
    id: 'dark-ambient',
    name: 'Dark Ambient',
    category: StyleCategory.AMBIENT,
    description: 'Atmospheric music with dark and eerie tones',
    tags: ['dark', 'atmospheric', 'eerie'],
    popularity: 5,
    relatedStyles: ['ambient', 'industrial'],
    tempo: 'slow',
    mood: ['dark', 'mysterious', 'intense']
  },
  {
    id: 'new-age',
    name: 'New Age',
    category: StyleCategory.AMBIENT,
    description: 'Relaxing music often used for meditation and healing',
    tags: ['relaxing', 'meditation', 'healing'],
    popularity: 6,
    relatedStyles: ['ambient', 'chillout'],
    tempo: 'slow',
    mood: ['calm', 'peaceful', 'uplifting']
  },

  // EXPERIMENTAL (5 styles)
  {
    id: 'idm',
    name: 'IDM',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Intelligent Dance Music with complex rhythms',
    tags: ['complex', 'rhythmic', 'electronic'],
    popularity: 5,
    relatedStyles: ['glitch', 'ambient'],
    tempo: 'variable',
    mood: ['complex', 'experimental', 'abstract']
  },
  {
    id: 'glitch',
    name: 'Glitch',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Music using digital artifacts and glitches',
    tags: ['digital', 'artifacts', 'experimental'],
    popularity: 4,
    relatedStyles: ['idm', 'noise'],
    tempo: 'variable',
    mood: ['experimental', 'chaotic', 'abstract']
  },
  {
    id: 'noise',
    name: 'Noise',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Music using noise and atonal sounds',
    tags: ['noise', 'atonal', 'experimental'],
    popularity: 3,
    relatedStyles: ['glitch', 'industrial'],
    tempo: 'variable',
    mood: ['chaotic', 'intense', 'abrasive']
  },
  {
    id: 'avant-garde-electronic',
    name: 'Avant-Garde Electronic',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Experimental electronic music pushing boundaries',
    tags: ['experimental', 'electronic', 'avant-garde'],
    popularity: 4,
    relatedStyles: ['idm', 'glitch'],
    tempo: 'variable',
    mood: ['experimental', 'abstract', 'innovative']
  },
  {
    id: 'free-improvisation',
    name: 'Free Improvisation',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Improvised music without predefined structure',
    tags: ['improvised', 'free', 'experimental'],
    popularity: 3,
    relatedStyles: ['free-jazz', 'avant-garde'],
    tempo: 'variable',
    mood: ['spontaneous', 'experimental', 'abstract']
  }
];

// Helper functions
export const getStylesByCategory = (category: StyleCategory): MusicStyle[] => {
  return MUSIC_STYLES.filter(style => style.category === category);
};

export const getStyleById = (id: string): MusicStyle | undefined => {
  return MUSIC_STYLES.find(style => style.id === id);
};

export const getRelatedStyles = (styleId: string): MusicStyle[] => {
  const style = getStyleById(styleId);
  if (!style) return [];
  
  return style.relatedStyles
    .map(id => getStyleById(id))
    .filter((s): s is MusicStyle => s !== undefined);
};

export const searchStyles = (query: string): MusicStyle[] => {
  const lowerQuery = query.toLowerCase();
  return MUSIC_STYLES.filter(style =>
    style.name.toLowerCase().includes(lowerQuery) ||
    style.description.toLowerCase().includes(lowerQuery) ||
    style.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

export const getPopularStyles = (limit: number = 10): MusicStyle[] => {
  return [...MUSIC_STYLES]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
};

export const getCategoryName = (category: StyleCategory): string => {
  const names: Record<StyleCategory, string> = {
    [StyleCategory.ELECTRONIC]: 'Electronic',
    [StyleCategory.ROCK]: 'Rock',
    [StyleCategory.HIP_HOP]: 'Hip-Hop',
    [StyleCategory.JAZZ]: 'Jazz',
    [StyleCategory.CLASSICAL]: 'Classical',
    [StyleCategory.WORLD]: 'World',
    [StyleCategory.AMBIENT]: 'Ambient',
    [StyleCategory.EXPERIMENTAL]: 'Experimental'
  };
  return names[category];
};
