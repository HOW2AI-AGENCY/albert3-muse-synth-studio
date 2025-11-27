import { vi } from 'vitest';
import 'vitest-dom/extend-expect';
import type { AudioPlayerTrack } from '@/types/track.types';

vi.mock('@sentry/react', () => ({
  withErrorBoundary: (component: unknown) => component,
  captureException: vi.fn(),
  withScope: vi.fn(),
  configureScope: vi.fn(),
}));

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
    toasts: [],
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock('@/stores/audioPlayerStore', async () => {
  const actual = await vi.importActual<typeof import('@/stores/audioPlayerStore')>(
    '@/stores/audioPlayerStore'
  );

  const createAudioPlayerValue = () => ({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    queue: [] as AudioPlayerTrack[],
    currentQueueIndex: -1,
    togglePlayPause: vi.fn(),
    playTrack: vi.fn(),
    playTrackWithQueue: vi.fn(),
    pauseTrack: vi.fn(),
    playNext: vi.fn(),
    playPrevious: vi.fn(),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    clearQueue: vi.fn(),
    reorderQueue: vi.fn(),
    switchToVersion: vi.fn(),
    getAvailableVersions: vi.fn<() => AudioPlayerTrack[]>(() => []),
    currentVersionIndex: 0,
    audioRef: { current: null },
    clearCurrentTrack: vi.fn(),
  });

  return {
    ...actual,
    useAudioPlayer: vi.fn(() => createAudioPlayerValue()),
    useAudioPlayerSafe: vi.fn(() => createAudioPlayerValue()),
  };
});

// Mock API Service - corrected to use a named export
vi.mock('@/services/api.service', () => ({
  ApiService: {
    getUserTracks: vi.fn(),
    deleteTrack: vi.fn(),
    likeTrack: vi.fn(),
    unlikeTrack: vi.fn(),
    downloadTrack: vi.fn(),
    createTrack: vi.fn(),
    generateMusic: vi.fn(),
    improvePrompt: vi.fn(),
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