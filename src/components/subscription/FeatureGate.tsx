/**
 * Feature Gate Component - Restricts access based on subscription
 * @module components/subscription/FeatureGate
 * @version 1.0.0
 */

import { ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { UpgradePrompt } from './UpgradePrompt';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Conditionally renders children based on feature access
 * 
 * @example
 * ```tsx
 * <FeatureGate feature="reference_audio">
 *   <ReferenceAudioUpload />
 * </FeatureGate>
 * ```
 */
export const FeatureGate = ({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) => {
  const { canAccess, upgradeRequired } = useSubscription();

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    const requiredPlan = upgradeRequired(feature);
    return <UpgradePrompt feature={feature} requiredPlan={requiredPlan} />;
  }

  return null;
};
