import { 
  Home, 
  Music, 
  Mic, 
  Settings, 
  Search,
  Heart,
  Download,
  Share2 as Share,
  User,
} from '@/utils/iconImports';

/**
 * Предустановленные вкладки для музыкального приложения
 */
export const defaultMusicTabs = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'library', label: 'Библиотека', icon: Music },
  { id: 'record', label: 'Запись', icon: Mic },
  { id: 'profile', label: 'Профиль', icon: User },
] as const;

/**
 * Предустановленные элементы бокового меню
 */
export const defaultDrawerItems = [
  { id: 'search', label: 'Поиск', icon: Search },
  { id: 'favorites', label: 'Избранное', icon: Heart },
  { id: 'downloads', label: 'Загрузки', icon: Download },
  { id: 'share', label: 'Поделиться', icon: Share },
  {
    id: 'settings',
    label: 'Настройки',
    icon: Settings,
    children: [
      { id: 'audio-settings', label: 'Аудио настройки', icon: Music },
      { id: 'app-settings', label: 'Настройки приложения', icon: Settings },
    ],
  },
] as const;