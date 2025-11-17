/**
 * FeatureGate - Access control component for subscription-gated features
 * @module components/common/FeatureGate
 * @version 1.0.0
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

export const FEATURE_PERMISSIONS: Record<string, string[]> = {
  simple_mode: ['free', 'pro', 'studio', 'enterprise'],
  basic_generation: ['free', 'pro', 'studio', 'enterprise'],
  lyrics_editor: ['free', 'pro', 'studio', 'enterprise'],
  pro_mode: ['pro', 'studio', 'enterprise'],
  ai_field_actions: ['pro', 'studio', 'enterprise'],
  reference_audio: ['pro', 'studio', 'enterprise'],
  daw_light: ['pro', 'studio', 'enterprise'],
  stems: ['pro', 'studio', 'enterprise'],
  lyrics_ai_tools: ['pro', 'studio', 'enterprise'],
  creative_director: ['studio', 'enterprise'],
  ai_context: ['studio', 'enterprise'],
  daw_advanced: ['studio', 'enterprise'],
  lyrics_drag_drop: ['studio', 'enterprise'],
  multi_reference: ['studio', 'enterprise'],
  project_templates: ['studio', 'enterprise'],
  wav_export: ['studio', 'enterprise'],
  midi_export: ['studio', 'enterprise'],
  collaboration: ['enterprise'],
  admin_panel: ['enterprise'],
  team_management: ['enterprise'],
  custom_workflows: ['enterprise'],
};
