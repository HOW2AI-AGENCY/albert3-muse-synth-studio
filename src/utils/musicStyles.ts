/**
 * Comprehensive music styles system with 70+ genres across 8 categories
 * Includes style recommendations, search, and preset combinations
 */
import type { StylePreset } from "@/types/styles";

export interface MusicStyle {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  description: string;
  relatedStyles: string[]; // IDs of related styles for AI recommendations
}

export interface StyleCategory {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  styles: MusicStyle[];
}

// Electronic Music Category
const electronicStyles: MusicStyle[] = [
  { id: "house", name: "House", icon: "🏠", gradient: "from-blue-500 to-cyan-500", description: "Четкий бит 4/4, грувовый бас", relatedStyles: ["techno", "edm", "dance-pop"] },
  { id: "techno", name: "Techno", icon: "⚡", gradient: "from-purple-600 to-blue-600", description: "Индустриальный, гипнотический", relatedStyles: ["house", "trance", "industrial"] },
  { id: "trance", name: "Trance", icon: "🌀", gradient: "from-indigo-500 to-purple-500", description: "Эмоциональные синтезаторы", relatedStyles: ["techno", "edm", "ambient"] },
  { id: "dubstep", name: "Dubstep", icon: "💥", gradient: "from-green-600 to-teal-600", description: "Тяжелый басс, вобл", relatedStyles: ["drum-and-bass", "trap", "glitch"] },
  { id: "drum-and-bass", name: "Drum and Bass", icon: "🥁", gradient: "from-red-600 to-orange-600", description: "Быстрый брейкбит, глубокий бас", relatedStyles: ["dubstep", "jungle", "breakcore"] },
  { id: "edm", name: "EDM", icon: "🎆", gradient: "from-pink-500 to-purple-600", description: "Энергичные дропы, фестивальный", relatedStyles: ["house", "trance", "electro-pop"] },
  { id: "synthwave", name: "Synthwave", icon: "🌆", gradient: "from-pink-600 to-purple-700", description: "Ретро синтезаторы 80-х", relatedStyles: ["chillwave", "vaporwave", "electro-pop"] },
  { id: "chillwave", name: "Chillwave", icon: "🌊", gradient: "from-cyan-400 to-blue-500", description: "Мечтательный, расслабляющий", relatedStyles: ["synthwave", "ambient", "dream-pop"] },
  { id: "ambient", name: "Ambient", icon: "🌌", gradient: "from-slate-500 to-blue-700", description: "Атмосферный, созерцательный", relatedStyles: ["chillwave", "experimental", "minimalism"] },
  { id: "idm", name: "IDM", icon: "🧠", gradient: "from-emerald-600 to-cyan-700", description: "Интеллектуальные ритмы", relatedStyles: ["glitch", "experimental", "breakcore"] }
];

// Rock Music Category
const rockStyles: MusicStyle[] = [
  { id: "rock", name: "Rock", icon: "🎸", gradient: "from-red-500 to-orange-500", description: "Классические гитарные риффы", relatedStyles: ["alternative", "indie", "hard-rock"] },
  { id: "alternative", name: "Alternative", icon: "🎵", gradient: "from-orange-600 to-red-600", description: "Нестандартный подход", relatedStyles: ["rock", "indie", "grunge"] },
  { id: "indie", name: "Indie", icon: "🌟", gradient: "from-yellow-500 to-orange-500", description: "Независимый, экспериментальный", relatedStyles: ["alternative", "indie-pop", "post-rock"] },
  { id: "hard-rock", name: "Hard Rock", icon: "⚡", gradient: "from-red-700 to-orange-700", description: "Мощные гитары, энергичный", relatedStyles: ["metal", "rock", "punk"] },
  { id: "metal", name: "Metal", icon: "🤘", gradient: "from-gray-700 to-red-800", description: "Тяжелые риффы, агрессивный", relatedStyles: ["hard-rock", "industrial", "grunge"] },
  { id: "punk", name: "Punk", icon: "💢", gradient: "from-pink-600 to-red-700", description: "Быстрый, бунтарский", relatedStyles: ["hard-rock", "grunge", "garage"] },
  { id: "grunge", name: "Grunge", icon: "🥀", gradient: "from-slate-600 to-gray-700", description: "Сырой, меланхоличный", relatedStyles: ["alternative", "punk", "metal"] },
  { id: "post-rock", name: "Post-Rock", icon: "🌄", gradient: "from-blue-600 to-slate-600", description: "Инструментальный, атмосферный", relatedStyles: ["indie", "experimental", "ambient"] },
  { id: "progressive", name: "Progressive", icon: "🎭", gradient: "from-purple-600 to-blue-700", description: "Сложные структуры", relatedStyles: ["post-rock", "metal", "psychedelic"] },
  { id: "psychedelic", name: "Psychedelic", icon: "🌈", gradient: "from-purple-500 to-pink-600", description: "Психоделические эффекты", relatedStyles: ["progressive", "indie", "experimental"] }
];

// Pop Music Category
const popStyles: MusicStyle[] = [
  { id: "pop", name: "Pop", icon: "⭐", gradient: "from-pink-500 to-purple-500", description: "Катchy мелодии, популярный", relatedStyles: ["synth-pop", "dance-pop", "indie-pop"] },
  { id: "synth-pop", name: "Synth-Pop", icon: "🎹", gradient: "from-purple-500 to-blue-500", description: "Синтезаторные поп-мелодии", relatedStyles: ["pop", "electro-pop", "synthwave"] },
  { id: "dream-pop", name: "Dream Pop", icon: "☁️", gradient: "from-pink-400 to-purple-400", description: "Эфирные вокалы, атмосферный", relatedStyles: ["indie-pop", "chillwave", "shoegaze"] },
  { id: "indie-pop", name: "Indie Pop", icon: "🌸", gradient: "from-rose-500 to-pink-500", description: "Независимый поп-саунд", relatedStyles: ["pop", "indie", "dream-pop"] },
  { id: "k-pop", name: "K-Pop", icon: "🇰🇷", gradient: "from-pink-600 to-purple-600", description: "Корейский поп, динамичный", relatedStyles: ["j-pop", "dance-pop", "electro-pop"] },
  { id: "j-pop", name: "J-Pop", icon: "🇯🇵", gradient: "from-red-500 to-pink-600", description: "Японский поп, яркий", relatedStyles: ["k-pop", "pop", "electro-pop"] },
  { id: "electro-pop", name: "Electro Pop", icon: "💫", gradient: "from-blue-500 to-purple-500", description: "Электронный поп", relatedStyles: ["synth-pop", "edm", "dance-pop"] },
  { id: "dance-pop", name: "Dance Pop", icon: "💃", gradient: "from-fuchsia-500 to-pink-500", description: "Танцевальный поп-бит", relatedStyles: ["pop", "electro-pop", "house"] },
  { id: "art-pop", name: "Art Pop", icon: "🎨", gradient: "from-purple-600 to-indigo-600", description: "Экспериментальный поп", relatedStyles: ["indie-pop", "experimental", "progressive"] }
];

// Hip-Hop Music Category
const hiphopStyles: MusicStyle[] = [
  { id: "hip-hop", name: "Hip-Hop", icon: "🎤", gradient: "from-purple-500 to-indigo-500", description: "Классический хип-хоп бит", relatedStyles: ["rap", "trap", "boom-bap"] },
  { id: "rap", name: "Rap", icon: "🎙️", gradient: "from-red-600 to-purple-600", description: "Речитативный вокал", relatedStyles: ["hip-hop", "trap", "grime"] },
  { id: "trap", name: "Trap", icon: "💎", gradient: "from-purple-700 to-pink-700", description: "808 бас, хай-хэты", relatedStyles: ["hip-hop", "rap", "drill"] },
  { id: "lofi-hip-hop", name: "Lo-fi Hip-Hop", icon: "📻", gradient: "from-amber-600 to-orange-600", description: "Расслабленный, винтажный", relatedStyles: ["boom-bap", "jazz", "chillwave"] },
  { id: "boom-bap", name: "Boom Bap", icon: "🥁", gradient: "from-orange-700 to-red-700", description: "Классический хип-хоп драм", relatedStyles: ["hip-hop", "lofi-hip-hop", "jazz"] },
  { id: "cloud-rap", name: "Cloud Rap", icon: "☁️", gradient: "from-sky-500 to-purple-500", description: "Эфирный, атмосферный рэп", relatedStyles: ["trap", "ambient", "experimental"] },
  { id: "drill", name: "Drill", icon: "🔥", gradient: "from-slate-700 to-red-800", description: "Агрессивный, темный", relatedStyles: ["trap", "grime", "uk-garage"] },
  { id: "grime", name: "Grime", icon: "⚔️", gradient: "from-gray-700 to-green-800", description: "UK электронный рэп", relatedStyles: ["drill", "rap", "uk-garage"] },
  { id: "underground", name: "Underground", icon: "🕶️", gradient: "from-gray-800 to-slate-900", description: "Андеграундный хип-хоп", relatedStyles: ["boom-bap", "experimental", "abstract"] }
];

// Jazz & Blues Category
const jazzBluesStyles: MusicStyle[] = [
  { id: "jazz", name: "Jazz", icon: "🎺", gradient: "from-yellow-500 to-amber-500", description: "Импровизация, свинг", relatedStyles: ["blues", "swing", "bebop"] },
  { id: "blues", name: "Blues", icon: "🎸", gradient: "from-blue-600 to-indigo-700", description: "Блюзовые ноты, душевный", relatedStyles: ["jazz", "soul", "rock"] },
  { id: "swing", name: "Swing", icon: "🎩", gradient: "from-amber-600 to-yellow-600", description: "Танцевальный джаз", relatedStyles: ["jazz", "bebop", "big-band"] },
  { id: "bebop", name: "Bebop", icon: "🎷", gradient: "from-orange-600 to-red-600", description: "Быстрый джаз, импровизация", relatedStyles: ["jazz", "swing", "fusion"] },
  { id: "smooth-jazz", name: "Smooth Jazz", icon: "🌙", gradient: "from-blue-500 to-purple-600", description: "Мягкий, расслабляющий", relatedStyles: ["jazz", "soul", "lounge"] },
  { id: "acid-jazz", name: "Acid Jazz", icon: "🌀", gradient: "from-green-600 to-yellow-600", description: "Джаз с электроникой", relatedStyles: ["jazz", "funk", "house"] },
  { id: "jazz-fusion", name: "Jazz Fusion", icon: "🔀", gradient: "from-purple-600 to-orange-600", description: "Джаз с роком/фанком", relatedStyles: ["jazz", "funk", "progressive"] },
  { id: "soul", name: "Soul", icon: "💫", gradient: "from-pink-600 to-purple-700", description: "Душевный, эмоциональный", relatedStyles: ["blues", "funk", "r&b"] },
  { id: "funk", name: "Funk", icon: "🕺", gradient: "from-yellow-600 to-orange-700", description: "Грувовый, танцевальный", relatedStyles: ["soul", "jazz-fusion", "disco"] }
];

// Classical Music Category
const classicalStyles: MusicStyle[] = [
  { id: "classical", name: "Classical", icon: "🎻", gradient: "from-emerald-500 to-teal-500", description: "Классическая музыка", relatedStyles: ["orchestral", "chamber", "baroque"] },
  { id: "orchestral", name: "Orchestral", icon: "🎼", gradient: "from-blue-600 to-indigo-600", description: "Оркестровое звучание", relatedStyles: ["classical", "cinematic", "epic"] },
  { id: "chamber-music", name: "Chamber Music", icon: "🎹", gradient: "from-purple-500 to-blue-600", description: "Камерная музыка", relatedStyles: ["classical", "baroque", "minimalism"] },
  { id: "opera", name: "Opera", icon: "🎭", gradient: "from-red-600 to-purple-600", description: "Оперное пение", relatedStyles: ["classical", "orchestral", "romantic"] },
  { id: "baroque", name: "Baroque", icon: "👑", gradient: "from-yellow-600 to-amber-700", description: "Музыка барокко", relatedStyles: ["classical", "chamber-music", "harpsichord"] },
  { id: "romantic", name: "Romantic", icon: "🌹", gradient: "from-pink-600 to-red-600", description: "Романтическая эпоха", relatedStyles: ["classical", "opera", "piano"] },
  { id: "contemporary-classical", name: "Contemporary Classical", icon: "🎨", gradient: "from-teal-600 to-blue-700", description: "Современная классика", relatedStyles: ["classical", "minimalism", "experimental"] },
  { id: "minimalism", name: "Minimalism", icon: "⬜", gradient: "from-gray-500 to-slate-600", description: "Минималистичная классика", relatedStyles: ["contemporary-classical", "ambient", "experimental"] }
];

// World Music Category
const worldStyles: MusicStyle[] = [
  { id: "latin", name: "Latin", icon: "💃", gradient: "from-red-500 to-yellow-500", description: "Латиноамериканские ритмы", relatedStyles: ["bossa-nova", "salsa", "reggaeton"] },
  { id: "reggae", name: "Reggae", icon: "🇯🇲", gradient: "from-green-600 to-yellow-500", description: "Ямайский ритм", relatedStyles: ["dub", "ska", "dancehall"] },
  { id: "afrobeat", name: "Afrobeat", icon: "🌍", gradient: "from-orange-600 to-red-600", description: "Африканские ритмы", relatedStyles: ["funk", "jazz", "highlife"] },
  { id: "bossa-nova", name: "Bossa Nova", icon: "🇧🇷", gradient: "from-green-500 to-blue-500", description: "Бразильская гитара", relatedStyles: ["latin", "jazz", "samba"] },
  { id: "flamenco", name: "Flamenco", icon: "🇪🇸", gradient: "from-red-600 to-orange-600", description: "Испанская гитара", relatedStyles: ["latin", "classical", "gypsy"] },
  { id: "celtic", name: "Celtic", icon: "☘️", gradient: "from-green-600 to-emerald-600", description: "Кельтская музыка", relatedStyles: ["folk", "irish", "scottish"] },
  { id: "middle-eastern", name: "Middle Eastern", icon: "🕌", gradient: "from-amber-600 to-orange-700", description: "Ближневосточные мотивы", relatedStyles: ["arabic", "persian", "turkish"] },
  { id: "indian-classical", name: "Indian Classical", icon: "🇮🇳", gradient: "from-orange-600 to-pink-600", description: "Индийская классика", relatedStyles: ["raga", "tabla", "sitar"] },
  { id: "k-folk", name: "K-Folk", icon: "🎋", gradient: "from-teal-600 to-blue-600", description: "Корейская народная", relatedStyles: ["folk", "traditional", "asian"] }
];

// Experimental Music Category
const experimentalStyles: MusicStyle[] = [
  { id: "experimental", name: "Experimental", icon: "🔬", gradient: "from-purple-700 to-pink-700", description: "Экспериментальный звук", relatedStyles: ["avant-garde", "noise", "glitch"] },
  { id: "noise", name: "Noise", icon: "📡", gradient: "from-gray-700 to-red-800", description: "Шумовая музыка", relatedStyles: ["experimental", "industrial", "harsh"] },
  { id: "avant-garde", name: "Avant-Garde", icon: "🎭", gradient: "from-indigo-700 to-purple-800", description: "Авангардная музыка", relatedStyles: ["experimental", "contemporary-classical", "abstract"] },
  { id: "glitch", name: "Glitch", icon: "⚡", gradient: "from-cyan-600 to-blue-700", description: "Электронные сбои", relatedStyles: ["idm", "experimental", "breakcore"] },
  { id: "vaporwave", name: "Vaporwave", icon: "🌴", gradient: "from-pink-500 to-cyan-500", description: "Ретро-футуризм", relatedStyles: ["synthwave", "chillwave", "ambient"] },
  { id: "phonk", name: "Phonk", icon: "👻", gradient: "from-purple-800 to-gray-900", description: "Темный мемфис-рэп", relatedStyles: ["trap", "underground", "drift"] },
  { id: "breakcore", name: "Breakcore", icon: "💥", gradient: "from-red-700 to-orange-800", description: "Экстремальный брейкбит", relatedStyles: ["drum-and-bass", "glitch", "hardcore"] },
  { id: "industrial", name: "Industrial", icon: "⚙️", gradient: "from-gray-800 to-slate-900", description: "Индустриальный звук", relatedStyles: ["noise", "metal", "techno"] }
];

export const styleCategories: StyleCategory[] = [
  { id: "electronic", name: "🎹 Электроника", icon: "🎹", gradient: "from-blue-500 to-cyan-500", styles: electronicStyles },
  { id: "rock", name: "🎸 Рок", icon: "🎸", gradient: "from-red-500 to-orange-500", styles: rockStyles },
  { id: "pop", name: "🎤 Поп", icon: "🎤", gradient: "from-pink-500 to-purple-500", styles: popStyles },
  { id: "hiphop", name: "🎧 Хип-хоп", icon: "🎧", gradient: "from-purple-500 to-indigo-500", styles: hiphopStyles },
  { id: "jazz-blues", name: "🎺 Джаз и Блюз", icon: "🎺", gradient: "from-yellow-500 to-amber-500", styles: jazzBluesStyles },
  { id: "classical", name: "🎻 Классика", icon: "🎻", gradient: "from-emerald-500 to-teal-500", styles: classicalStyles },
  { id: "world", name: "🌍 Мировая", icon: "🌍", gradient: "from-green-600 to-yellow-500", styles: worldStyles },
  { id: "experimental", name: "🔬 Экспериментальная", icon: "🔬", gradient: "from-purple-700 to-pink-700", styles: experimentalStyles },
];

// Flatten all styles for search and quick access
export const allStyles = styleCategories.flatMap(cat => cat.styles);

// Preset combinations
export const stylePresets: StylePreset[] = [
  {
    id: "summer-hit",
    name: "Летний хит",
    icon: "☀️",
    description: "Энергичный трек с фестивальной атмосферой",
    styleIds: ["house", "future-bass", "tech-house"],
    gradient: "from-yellow-400 to-orange-500"
  },
  {
    id: "melancholic-vibe",
    name: "Меланхоличный вайб",
    icon: "🌧️",
    description: "Задумчивая атмосферная композиция",
    styleIds: ["shoegaze", "post-rock", "ambient"],
    gradient: "from-blue-500 to-purple-600"
  },
  {
    id: "workout-energy",
    name: "Энергичная тренировка",
    icon: "💪",
    description: "Мощный трек для интенсивных тренировок",
    styleIds: ["trap", "dubstep", "hardstyle"],
    gradient: "from-red-600 to-orange-700"
  },
  {
    id: "chill-study",
    name: "Учёба и фокус",
    icon: "📚",
    description: "Спокойная музыка для концентрации",
    styleIds: ["lo-fi-hip-hop", "chillwave", "ambient"],
    gradient: "from-teal-500 to-blue-600"
  },
  {
    id: "romantic-evening",
    name: "Романтический вечер",
    icon: "💕",
    description: "Нежная музыка для романтики",
    styleIds: ["smooth-jazz", "romantic", "bebop"],
    gradient: "from-pink-500 to-rose-600"
  },
  {
    id: "road-trip",
    name: "Дорожное приключение",
    icon: "🚗",
    description: "Драйвовая музыка для поездки",
    styleIds: ["classic-rock", "indie-rock", "alternative-rock"],
    gradient: "from-orange-500 to-red-600"
  }
];

// Helper functions
export const getStyleById = (id: string): MusicStyle | undefined => {
  return allStyles.find(style => style.id === id);
};

export const getRelatedStyles = (styleId: string, limit: number = 5): MusicStyle[] => {
  const style = getStyleById(styleId);
  if (!style) return [];
  
  return style.relatedStyles
    .map(id => getStyleById(id))
    .filter((s): s is MusicStyle => s !== undefined)
    .slice(0, limit);
};

export const searchStyles = (query: string): MusicStyle[] => {
  const lowerQuery = query.toLowerCase();
  return allStyles.filter(style => 
    style.name.toLowerCase().includes(lowerQuery) ||
    style.description.toLowerCase().includes(lowerQuery)
  );
};

// LocalStorage keys
export const STYLE_HISTORY_KEY = 'music-generator-style-history';
export const MAX_HISTORY_SIZE = 10;

export const getStyleHistory = (): string[] => {
  try {
    const history = localStorage.getItem(STYLE_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

export const addToStyleHistory = (styleId: string): void => {
  try {
    const history = getStyleHistory();
    const newHistory = [styleId, ...history.filter(id => id !== styleId)].slice(0, MAX_HISTORY_SIZE);
    localStorage.setItem(STYLE_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to save style history:', error);
  }
};
