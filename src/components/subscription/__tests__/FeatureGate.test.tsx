import { render, screen } from '@testing-library/react';
import { FeatureGate } from '../FeatureGate';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock useSubscription hook
vi.mock('@/contexts/SubscriptionContext');

describe('FeatureGate', () => {
  it('should render children when user has access', () => {
    (useSubscription as jest.Mock).mockReturnValue({
      canAccess: () => true,
    });

    render(
      <FeatureGate feature="test-feature">
        <div>Child Component</div>
      </FeatureGate>
    );

    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });

  it('should render fallback when user does not have access', () => {
    (useSubscription as jest.Mock).mockReturnValue({
      canAccess: () => false,
      upgradeRequired: () => 'pro',
      plan: { name: 'free' },
    });

    render(
      <FeatureGate feature="test-feature" fallback={<div>Fallback</div>}>
        <div>Child Component</div>
      </FeatureGate>
    );

    expect(screen.getByText('Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Child Component')).not.toBeInTheDocument();
  });
});
