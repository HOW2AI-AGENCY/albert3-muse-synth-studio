/**
 * Subscription Context - Global subscription state management
 * @module contexts/SubscriptionContext
 * @version 1.0.0
 * 
 * @description
 * Manages user subscription state, generation limits, and feature access.
 * Provides hooks for checking plan permissions and upgrading subscriptions.
 * 
 * @example
 * ```tsx
 * const { plan, canAccess, checkGenerationLimit } = useSubscription();
 * 
 * if (!canAccess('creative_director')) {
 *   return <UpgradePrompt feature="creative_director" />;
 * }
 * 
 * const canGenerate = await checkGenerationLimit();
 * if (!canGenerate) {
 *   toast.error('Daily limit reached');
 * }
 * ```
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export type SubscriptionPlan = 'free' | 'pro' | 'studio' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial';

export interface SubscriptionPlanData {
  id: string;
  name: SubscriptionPlan;
  display_name: string;
  description: string | null;
  price_monthly: number | null;
  price_annual: number | null;
  credits_monthly: number;
  credits_daily_limit: number | null;
  max_projects: number | null;
  max_concurrent_generations: number;
  max_reference_audios: number;
  features: string[];
}

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expires_at: string | null;
  credits_remaining: number;
  credits_used_today: number;
  last_credit_reset_at: string;
}

export interface GenerationLimits {
  daily_limit: number | null;
  used_today: number;
  remaining: number | null;
  can_generate: boolean;
  reset_at: string;
}

interface SubscriptionContextValue {
  subscription: UserSubscription | null;
  plan: SubscriptionPlanData | null;
  isLoading: boolean;
  limits: GenerationLimits | null;
  checkGenerationLimit: () => Promise<boolean>;
  incrementGenerationUsage: () => Promise<void>;
  canAccess: (feature: string) => boolean;
  upgradeRequired: (feature: string) => SubscriptionPlan | null;
  refreshSubscription: () => Promise<void>;
  upgradePlan: (planName: SubscriptionPlan) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlanData | null>(null);
  const [limits, setLimits] = useState<GenerationLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Load profile with subscription data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status, subscription_expires_at, credits_remaining, credits_used_today, last_credit_reset_at')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Load plan details
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', profile.subscription_plan || 'free')
        .eq('is_active', true)
        .single();

      if (planError) {
        logger.error('Failed to load plan', planError, 'SubscriptionContext');
        throw planError;
      }

      // Load generation limits
      const { data: limitsData, error: limitsError } = await supabase
        .from('generation_limits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (limitsError && limitsError.code !== 'PGRST116') {
        logger.error('Failed to load limits', limitsError, 'SubscriptionContext');
      }

      // Calculate limits
      const dailyLimit = limitsData?.generations_limit_daily ?? planData.credits_daily_limit;
      const usedToday = limitsData?.generations_used_today ?? 0;
      const remaining = dailyLimit !== null ? Math.max(0, dailyLimit - usedToday) : null;

      setSubscription({
        plan: (profile.subscription_plan as SubscriptionPlan) || 'free',
        status: (profile.subscription_status as SubscriptionStatus) || 'active',
        expires_at: profile.subscription_expires_at || null,
        credits_remaining: profile.credits_remaining ?? 0,
        credits_used_today: profile.credits_used_today ?? 0,
        last_credit_reset_at: profile.last_credit_reset_at || new Date().toISOString(),
      });

      const features = Array.isArray(planData.features) 
        ? (planData.features as string[]).filter((f): f is string => typeof f === 'string')
        : [];
      
      const planWithFeatures: SubscriptionPlanData = {
        id: planData.id,
        name: (planData.name as SubscriptionPlan) || 'free',
        display_name: planData.display_name,
        description: planData.description,
        price_monthly: planData.price_monthly,
        price_annual: planData.price_annual,
        credits_monthly: planData.credits_monthly,
        credits_daily_limit: planData.credits_daily_limit,
        max_projects: planData.max_projects,
        max_concurrent_generations: planData.max_concurrent_generations ?? 1,
        max_reference_audios: planData.max_reference_audios ?? 0,
        features,
      };
      
      setPlan(planWithFeatures);

      setLimits({
        daily_limit: dailyLimit,
        used_today: usedToday,
        remaining,
        can_generate: dailyLimit === null || usedToday < dailyLimit,
        reset_at: limitsData?.last_reset_at ?? new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Failed to load subscription', error as Error, 'SubscriptionContext');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const checkGenerationLimit = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc('check_generation_limit', {
        _user_id: user.id,
      });

      if (error) throw error;
      return data === true;
    } catch (error) {
      logger.error('Failed to check limit', error as Error, 'SubscriptionContext');
      return false;
    }
  }, []);

  const incrementGenerationUsage = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('increment_generation_usage', {
        _user_id: user.id,
      });

      if (error) throw error;

      // Update local state
      if (limits) {
        setLimits({
          ...limits,
          used_today: limits.used_today + 1,
          remaining: limits.remaining !== null ? Math.max(0, limits.remaining - 1) : null,
          can_generate: limits.daily_limit === null || (limits.used_today + 1) < limits.daily_limit,
        });
      }
    } catch (error) {
      logger.error('Failed to increment usage', error as Error, 'SubscriptionContext');
    }
  }, [limits]);

  const canAccess = useCallback((feature: string): boolean => {
    if (!plan) return false;
    if (plan.features.includes('all_features')) return true;
    return plan.features.includes(feature);
  }, [plan]);

  const upgradeRequired = useCallback((feature: string): SubscriptionPlan | null => {
    if (canAccess(feature)) return null;
    
    // Simple mapping: most features require pro or higher
    const proFeatures = ['pro_mode', 'ai_field_actions', 'reference_audio', 'stems'];
    const studioFeatures = ['creative_director', 'ai_context', 'daw_advanced'];
    
    if (studioFeatures.includes(feature)) return 'studio';
    if (proFeatures.includes(feature)) return 'pro';
    return 'pro';
  }, [canAccess]);

  const refreshSubscription = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  const upgradePlan = useCallback(async (planName: SubscriptionPlan) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // TODO: Integrate with Stripe payment
      logger.info('Upgrade requested', 'SubscriptionContext', { planName });
      
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_plan: planName })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Upgraded to ${planName.toUpperCase()} plan!`);
      await refreshSubscription();
    } catch (error) {
      logger.error('Failed to upgrade', error as Error, 'SubscriptionContext');
      toast.error('Failed to upgrade plan');
      throw error;
    }
  }, [refreshSubscription]);

  const value: SubscriptionContextValue = {
    subscription,
    plan,
    isLoading,
    limits,
    checkGenerationLimit,
    incrementGenerationUsage,
    canAccess,
    upgradeRequired,
    refreshSubscription,
    upgradePlan,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextValue => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export default SubscriptionContext;
