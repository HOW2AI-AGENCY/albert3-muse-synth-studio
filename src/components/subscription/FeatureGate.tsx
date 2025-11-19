/**
 * FeatureGate - Access control component for subscription-gated features
 * @module components/subscription/FeatureGate
 * @version 1.1.0
 *
 * @description
 * Wraps features that require specific subscription tiers.
 * Shows upgrade prompt when user lacks access.
 *
 * @example
 * ```tsx
 * <FeatureGate feature="creative_director">
 *   <CreativeDirectorPanel />
 * </FeatureGate>
 *
 * // With custom fallback
 * <FeatureGate
 *   feature="stems"
 *   fallback={<CustomUpgradeUI />}
 * >
 *   <StemSeparationTool />
 * </FeatureGate>
 * ```
 */

import React, { ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';

interface FeatureGateProps {
  feature: string;
  fallback?: ReactNode;
  children: ReactNode;
  customCheck?: () => boolean;
  className?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  fallback,
  children,
  customCheck,
  className,
}) => {
  const { canAccess, upgradeRequired, plan } = useSubscription();

  const hasAccess = customCheck ? customCheck() : canAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  const requiredPlan = upgradeRequired(feature);

  return (
    <div className={className}>
      <UpgradePrompt
        feature={feature}
        requiredPlan={requiredPlan}
        currentPlan={plan?.name}
      />
    </div>
  );
};
