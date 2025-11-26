/**
 * Vitest Setup File
 *
 * This file contains global test configuration and mocks for the Vitest environment.
 * It ensures that common dependencies like Supabase, React Router, and UI components
 * are consistently mocked across all unit tests, preventing boilerplate and side effects.
 */
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

// Automatically clean up the DOM after each test
afterEach(() => {
  cleanup();
});

// --- MOCKS ---

/**
 * Mock Supabase Client
 *
 * This is a configurable mock for the Supabase client. It allows tests to
 * dynamically provide mock data, RPC responses, and function results.
 *
 * To use in a test:
 *
 * import { supabase } from '@/integrations/supabase/client';
 * import { vi } from 'vitest';
 *
 * vi.mocked(supabase.from).mockReturnValue({
 *   select: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Test' }], error: null }),
 * } as any);
 */
const createDeepMock = (name = 'deepMock') => {
  const mock = vi.fn().mockName(name);
  // @ts-ignore
  mock.mockReturnValue(new Proxy({}, {
    get: (target, prop) => {
      // @ts-ignore
      if (!target[prop]) {
        // @ts-ignore
        target[prop] = createDeepMock(`${name}.${String(prop)}`);
      }
      // @ts-ignore
      return target[prop];
    },
  }));
  return mock;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null }),
      signIn: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn((callback) => {
        // Immediately invoke callback with a mock session
        callback('SIGNED_IN', { access_token: 'test-token' });
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
    },
    from: createDeepMock('supabase.from'),
    rpc: createDeepMock('supabase.rpc'),
    functions: {
      invoke: createDeepMock('supabase.functions.invoke'),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock/path.mp3' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/mock/path.mp3' } }),
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        // Allow tests to optionally invoke the callback
        if (callback) {
          setTimeout(() => callback('SUBSCRIBED'), 0);
        }
        return {
          unsubscribe: vi.fn(),
        };
      }),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));


/**
 * Mock React Router
 * Provides default mocks for common React Router hooks.
 */
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn((path) => console.log(`Mock navigate to: ${path}`)),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
    Link: ({ children, to }: { children: React.ReactNode, to: string }) => React.createElement('a', { href: to }, children),
  };
});

/**
 * Mock `sonner` for toast notifications
 */
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// --- BROWSER API MOCKS ---

/**
 * Mock `window.matchMedia`
 * Used by responsive hooks and components.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

/**
 * Mock IntersectionObserver and ResizeObserver
 * Used by components that react to visibility or size changes.
 */
const observerMock = {
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
};

global.IntersectionObserver = vi.fn().mockImplementation(() => observerMock);
global.ResizeObserver = vi.fn().mockImplementation(() => observerMock);


// --- CONTEXT & HOOK MOCKS ---

/**
 * Mock AuthContext
 * Provides a default authenticated user.
 */
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  const AuthContext = React.createContext({
      userId: 'test-user-id',
      isLoading: false,
  });

  return {
    ...actual,
    AuthContext,
    useAuth: () => ({
      userId: 'test-user-id',
      isLoading: false,
    }),
  };
});


/**
 * Mock `use-mobile` hook
 * Defaults to desktop view for tests.
 */
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));


// --- UI COMPONENT MOCKS ---

/**
 * Mock shadcn/ui Tooltip
 * The actual component requires a TooltipProvider, which complicates testing.
 * This mock renders children directly, bypassing the provider requirement.
 */
vi.mock('@/components/ui/tooltip', async () => {
    const actual = await vi.importActual('@/components/ui/tooltip');
    return {
        ...actual,
        TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
    };
});

/**
 * Mock `react-resizable-panels`
 * The library has complex internal logic not suitable for a JSDOM environment.
 */
vi.mock("react-resizable-panels", async () => {
  const actual = await vi.importActual("react-resizable-panels");
  return {
    ...actual,
    PanelGroup: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'panel-group' }, children),
    Panel: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'panel' }, children),
    PanelResizeHandle: () => React.createElement('div', { 'data-testid': 'resize-handle' }),
  };
});
