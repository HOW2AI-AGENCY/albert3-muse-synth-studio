/**
 * Vitest Setup File
 * Global test configuration and mocks
 */
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      const mockData = {
        'tracks': [{ id: 'track-1', title: 'Test Track', status: 'completed', audio_url: 'url1', created_at: new Date().toISOString() }],
        'track_versions': [{ id: 'version-1', track_id: 'track-1', version_number: 1 }],
      };

      const handler = {
        get(target: any, prop: string) {
          if (prop === 'then') {
            return target[prop];
          }
          return (...args: any[]) => {
            const newPromise = target.then((result: any) => {
              // This is a simplified mock. For real tests, you'd implement the logic for
              // select, eq, order, etc. For now, we just return the mock data.
              if (prop === 'select') {
                return { data: mockData[table as keyof typeof mockData] || [], error: null };
              }
              if (prop === 'single' || prop === 'maybeSingle') {
                return { data: (mockData[table as keyof typeof mockData] || [])[0] || null, error: null };
              }
              return result;
            });
            // Make the new promise chainable
            Object.assign(newPromise, handler);
            return newPromise;
          };
        }
      };

      const promise = Promise.resolve({ data: mockData[table as keyof typeof mockData] || [], error: null });
      Object.assign(promise, handler);
      return promise;
    }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    functions: {
      invoke: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
    useParams: () => ({}),
  };
});

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock AuthContext
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      userId: 'test-user-id',
      isLoading: false,
    }),
  };
});
