/**
 * Unit Tests for SubscriptionContext
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { ReactNode } from 'react';

// Note: Supabase mock is in tests/setup.ts
// We only configure specific method responses here

describe('SubscriptionContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SubscriptionProvider>{children}</SubscriptionProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    } as any);
  });

  describe('Provider Initialization', () => {
    it('should provide default context values', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                name: 'free',
                display_name: 'Free',
                credits_monthly: 10,
                credits_daily_limit: 3,
              },
              error: null,
            }),
          })),
        })),
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                generations_used_today: 0,
                generations_limit_daily: 3,
              },
              error: null,
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(typeof result.current.canAccess).toBe('function');
        expect(typeof result.current.checkGenerationLimit).toBe('function');
        expect(typeof result.current.upgradeRequired).toBe('function');
      });
    });
  });

  describe('Plan Loading', () => {
    it('should load user plan on mount', async () => {
      const mockPlan = {
        name: 'pro',
        display_name: 'Pro',
        credits_monthly: 100,
        credits_daily_limit: 20,
        features: ['ai_context', 'reference_audio', 'stems'],
      };

      // First call: profiles table
      const profileBuilder = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                subscription_plan: 'pro',
                subscription_status: 'active',
                credits_remaining: 100,
                credits_used_today: 5,
              },
              error: null,
            }),
          })),
        })),
      };

      // Second call: subscription_plans table (has .eq().eq().single() chain)
      const plansEqBuilder = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPlan,
          error: null,
        }),
      };

      const plansBuilder = {
        select: vi.fn(() => ({
          eq: vi.fn(() => plansEqBuilder),
        })),
      };

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        callCount++;
        if (table === 'profiles') return profileBuilder as any;
        if (table === 'subscription_plans') return plansBuilder as any;
        return profileBuilder as any; // fallback
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });
    });

    it('should handle plan loading errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockPlan,
              error: null,
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });
    });

    it('should handle plan loading errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.plan).toBeNull();
      });
    });
  });

  describe('Feature Access Control', () => {
    it('should allow access to features in user plan', async () => {
      const mockPlan = {
        name: 'pro',
        display_name: 'Pro',
        features: ['ai_context', 'reference_audio'],
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockPlan,
              error: null,
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.canAccess('ai_context')).toBe(true);
        expect(result.current.canAccess('reference_audio')).toBe(true);
      });
    });

    it('should deny access to features not in user plan', async () => {
      const mockPlan = {
        name: 'free',
        display_name: 'Free',
        features: [],
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockPlan,
              error: null,
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.canAccess('creative_director')).toBe(false);
        expect(result.current.canAccess('collaboration')).toBe(false);
      });
    });
  });

  describe('Generation Limits', () => {
    it('should check generation limits correctly', async () => {
      const mockLimits = {
        generations_used_today: 2,
        generations_limit_daily: 3,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockLimits,
              error: null,
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).toEqual(mockLimits);
      });

      const canGenerate = await result.current.checkGenerationLimit();
      expect(canGenerate).toBe(true);
    });

    it('should return false when limit is exceeded', async () => {
      const mockLimits = {
        generations_used_today: 3,
        generations_limit_daily: 3,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockLimits,
              error: null,
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).toEqual(mockLimits);
      });

      const canGenerate = await result.current.checkGenerationLimit();
      expect(canGenerate).toBe(false);
    });

    it('should handle null limits (unlimited)', async () => {
      const mockLimits = {
        generations_used_today: 100,
        generations_limit_daily: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockLimits,
              error: null,
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).toEqual(mockLimits);
      });

      const canGenerate = await result.current.checkGenerationLimit();
      expect(canGenerate).toBe(true);
    });
  });

  describe('Upgrade Required', () => {
    it('should return correct required plan for feature', async () => {
      const mockPlan = {
        name: 'free',
        display_name: 'Free',
        features: [],
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockPlan,
              error: null,
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });

      const requiredPlan = result.current.upgradeRequired('ai_context');
      expect(['pro', 'studio']).toContain(requiredPlan);
    });

    it('should return null if user already has access', async () => {
      const mockPlan = {
        name: 'pro',
        display_name: 'Pro',
        features: ['ai_context'],
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockPlan,
              error: null,
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });

      const requiredPlan = result.current.upgradeRequired('ai_context');
      expect(requiredPlan).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database connection failed'),
            }),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.plan).toBeNull();
      });
    });
  });
});
