import { renderHook } from '@testing-library/react';
import { SubscriptionProvider, useSubscription } from '../SubscriptionContext';
import { describe, it, expect } from 'vitest';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { name: 'free', features: [] }, error: null }),
          })),
          single: vi.fn().mockResolvedValue({ data: { subscription_plan: 'free' }, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
}));

describe('SubscriptionContext', () => {
  it('should not throw an error when useSubscription is used within a SubscriptionProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SubscriptionProvider>{children}</SubscriptionProvider>
    );
    const { result } = renderHook(() => useSubscription(), { wrapper });

    expect(result.current).toBeDefined();
  });
});
