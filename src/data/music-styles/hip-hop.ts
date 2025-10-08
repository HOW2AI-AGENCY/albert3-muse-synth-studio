import { MusicStyle, StyleCategory } from './types';

export const hipHopStyles: MusicStyle[] = [
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
];
