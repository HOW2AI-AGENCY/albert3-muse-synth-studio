import { vi } from 'vitest';
import 'vitest-dom/extend-expect';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Simple key-to-text mapping for Russian
      const translations: { [key: string]: string } = {
        'auth.signup': 'Регистрация',
        'auth.signin': 'Войти',
        'generator.prompt.placeholder': 'Опишите желаемую музыку...',
        'generator.genres.pop': 'Поп',
        'generator.genres.rock': 'Рок',
        'generator.genres.electronic': 'Электроника',
        'track.play': 'Воспроизвести',
        'track.pause': 'Пауза',
        'track.like': 'В избранное',
        'track.download': 'Скачать',
        'track.share': 'Поделиться',
        'track.actions': 'Действия',
      };
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: 'ru',
    },
  }),
}));

// Mock Supabase
vi.mock('@/integrations/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

// Mock custom hooks
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/contexts/AudioPlayerContext', () => ({
  useAudioPlayer: vi.fn(() => ({
    currentTrack: null,
    isPlaying: false,
    togglePlayPause: vi.fn(),
    playTrack: vi.fn(),
    playNext: vi.fn(),
    playPrevious: vi.fn(),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    volume: 1,
    duration: 0,
    currentTime: 0,
    queue: [],
    setQueue: vi.fn(),
    clearCurrentTrack: vi.fn(),
  })),
}));

vi.mock('@/hooks/useMusicGeneration', () => ({
  useMusicGeneration: vi.fn(() => ({
    prompt: '',
    setPrompt: vi.fn(),
    isGenerating: false,
    generateMusic: vi.fn(),
    improvePrompt: vi.fn(),
    styleTags: [],
    setStyleTags: vi.fn(),
    vocals: false,
    setVocals: vi.fn(),
  })),
}));

// Mock API Service
vi.mock('@/services/api.service', () => ({
  default: {
    getUserTracks: vi.fn(),
    deleteTrack: vi.fn(),
    likeTrack: vi.fn(),
    unlikeTrack: vi.fn(),
    downloadTrack: vi.fn(),
  },
}));

// Mock window.matchMedia for useMediaQuery hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

// Mock ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));
vi.stubGlobal('ResizeObserver', ResizeObserverMock);