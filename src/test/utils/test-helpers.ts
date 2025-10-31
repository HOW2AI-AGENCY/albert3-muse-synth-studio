/**
 * Test Helpers & Mock Factories
 * Week 3: Testing Infrastructure
 * 
 * Provides reusable mock factories for:
 * - Supabase client mocking
 * - GenerationService mocking
 * - Track data generation
 * - Toast function mocking
 */

import { vi } from 'vitest';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============= Supabase Mock Factory =============

export interface MockSupabaseClient {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  functions: {
    invoke: ReturnType<typeof vi.fn>;
  };
  channel: ReturnType<typeof vi.fn>;
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
  };
};

// ============= GenerationService Mock Factory =============

export interface MockGenerationService {
  generate: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
}

export const createMockGenerationService = (): MockGenerationService => {
  return {
    generate: vi.fn().mockResolvedValue({
      success: true,
      trackId: 'test-track-456',
      taskId: 'test-task-789',
      provider: 'suno',
      message: 'Generation started',
    }),
    subscribe: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    } as unknown as RealtimeChannel),
    unsubscribe: vi.fn(),
  };
};

// ============= Track Data Factory =============

export interface MockTrack {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  lyrics?: string | null;
  style_tags?: string[] | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_url?: string | null;
  cover_url?: string | null;
  video_url?: string | null;
  provider: 'suno' | 'mureka';
  has_vocals?: boolean;
  duration_seconds?: number | null;
  created_at: string;
  updated_at: string;
  error_message?: string | null;
}

export const createMockTrack = (overrides: Partial<MockTrack> = {}): MockTrack => {
  return {
    id: 'test-track-123',
    user_id: 'test-user-456',
    title: 'Test Track',
    prompt: 'Epic orchestral music',
    lyrics: null,
    style_tags: ['orchestral', 'epic'],
    status: 'pending',
    audio_url: null,
    cover_url: null,
    video_url: null,
    provider: 'suno',
    has_vocals: true,
    duration_seconds: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    error_message: null,
    ...overrides,
  };
};

// ============= Toast Mock Factory =============

export type MockToastFunction = ReturnType<typeof vi.fn>;

export const createMockToast = (): MockToastFunction => {
  return vi.fn();
};

// ============= Rate Limiter Mock =============

export const createMockRateLimiter = () => {
  return {
    check: vi.fn().mockReturnValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    }),
    reset: vi.fn(),
  };
};

// ============= Common Test Data =============

export const TEST_USER_ID = 'test-user-123';
export const TEST_TRACK_ID = 'test-track-456';
export const TEST_TASK_ID = 'test-task-789';

export const VALID_PROMPT = 'Epic orchestral music with powerful drums';
export const VALID_LYRICS = 'Verse 1\nChorus\nVerse 2';
export const EMPTY_PROMPT = '';
export const SHORT_PROMPT = 'ab'; // Less than MIN_PROMPT_LENGTH (3)
export const LONG_PROMPT = 'a'.repeat(501); // More than MAX_PROMPT_LENGTH (500)
export const LONG_LYRICS = 'a'.repeat(3001); // More than MAX_LYRICS_LENGTH (3000)

// ============= Wait Helper =============

/**
 * Wait for async operations to complete
 */
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Wait for a specific amount of time
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============= Realtime Event Simulators =============

export const simulateRealtimeEvent = (
  channel: any,
  eventType: 'postgres_changes',
  payload: any
) => {
  const handlers = channel._handlers || [];
  handlers.forEach((handler: any) => {
    if (handler.event === eventType) {
      handler.callback(payload);
    }
  });
};

export const createCompletedTrackPayload = (trackId: string, title: string = 'Test Track') => ({
  new: {
    id: trackId,
    status: 'completed',
    title,
    audio_url: 'https://example.com/audio.mp3',
  },
});

export const createFailedTrackPayload = (trackId: string, errorMessage: string = 'Generation failed') => ({
  new: {
    id: trackId,
    status: 'failed',
    title: 'Test Track',
    error_message: errorMessage,
  },
});
