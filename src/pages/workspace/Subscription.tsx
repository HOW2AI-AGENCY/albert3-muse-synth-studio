/**
 * Subscription Management Page
 * @module pages/workspace/Subscription
 * @version 1.0.0
 */

import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Check, Zap, Crown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLAN_ICONS = {
  free: Zap,
  pro: Crown,
  studio: Building2,
  enterprise: Building2,
};

const PLAN_COLORS = {
  free: 'text-muted-foreground',
  pro: 'text-primary',
  studio: 'text-purple-500',
  enterprise: 'text-amber-500',
};

export default function Subscription() {
  const { subscription, limits, isLoading, upgradePlan } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const usagePercent = limits?.daily_limit 
    ? (limits.used_today / limits.daily_limit) * 100 
    : 0;

  const plans = [
    {
      name: 'free' as const,
      displayName: 'Free',
      price: 0,
      description: 'Perfect for getting started',
      features: [
        '10 generations/day',
        'Basic AI features',
        '1 active project',
        'Community support',
      ],
      highlighted: false,
    },
    {
      name: 'pro' as const,
      displayName: 'Pro',
      price: 29,
      description: 'For serious creators',
      features: [
        'Unlimited generations',
        'Pro AI features',
        'Reference audio',
        'Stem separation',
        '10 active projects',
        'Priority support',
      ],
      highlighted: true,
    },
    {
      name: 'studio' as const,
      displayName: 'Studio',
      price: 99,
      description: 'For professional studios',
      features: [
        'Everything in Pro',
        'Creative Director AI',
        'AI Context Engine',
        'Advanced DAW features',
        'Unlimited projects',
        'Dedicated support',
      ],
      highlighted: false,
    },
    {
      name: 'enterprise' as const,
      displayName: 'Enterprise',
      price: null,
      description: 'Custom solutions',
      features: [
        'Everything in Studio',
        'Custom API access',
        'White-label options',
        'SLA guarantee',
        'Custom training',
        'Dedicated account manager',
      ],
      highlighted: false,
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                You are currently on the <span className="font-semibold capitalize">{currentPlan}</span> plan
              </CardDescription>
            </div>
            <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'} className="h-6 text-sm capitalize">
              {currentPlan}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Daily Generations</span>
              <span className="font-medium">
                {limits?.used_today || 0} / {limits?.daily_limit || '∞'}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>
          
          {subscription?.expires_at && (
            <div className="text-sm text-muted-foreground">
              <span>Renewal date: </span>
              <span className="font-medium">
                {new Date(subscription.expires_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Upgrade Your Plan</h2>
          <p className="text-muted-foreground">Choose the plan that fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((planItem) => {
            const Icon = PLAN_ICONS[planItem.name];
            const isCurrentPlan = currentPlan === planItem.name;
            
            return (
              <Card 
                key={planItem.name}
                className={cn(
                  "relative transition-all",
                  planItem.highlighted && "border-primary shadow-lg",
                  isCurrentPlan && "ring-2 ring-primary"
                )}
              >
                {planItem.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-6 h-6", PLAN_COLORS[planItem.name])} />
                    <CardTitle>{planItem.displayName}</CardTitle>
                  </div>
                  <CardDescription>{planItem.description}</CardDescription>
                  <div className="pt-4">
                    {planItem.price !== null ? (
                      <div>
                        <span className="text-4xl font-bold">${planItem.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold">Custom</div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2">
                    {planItem.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {isCurrentPlan ? (
                    <Button disabled className="w-full">Current Plan</Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={planItem.highlighted ? 'default' : 'outline'}
                      onClick={() => {
                        if (planItem.name === 'enterprise') {
                          window.location.href = 'mailto:enterprise@albert3.app';
                        } else {
                          upgradePlan(planItem.name);
                        }
                      }}
                    >
                      {planItem.name === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Can I change plans anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">What payment methods do you accept?</h4>
            <p className="text-sm text-muted-foreground">
              We accept all major credit cards, PayPal, and wire transfers for Enterprise plans.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Is there a refund policy?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, we offer a 14-day money-back guarantee for all paid plans.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
