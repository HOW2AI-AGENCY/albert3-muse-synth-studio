/**
 * UpgradePrompt - Subscription upgrade UI component
 * @module components/subscription/UpgradePrompt
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Zap, ArrowRight } from 'lucide-react';
import type { SubscriptionPlan } from '@/contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  requiredPlan: SubscriptionPlan | null;
  currentPlan?: SubscriptionPlan;
}

const FEATURE_NAMES: Record<string, string> = {
  creative_director: 'Creative Director AI',
  ai_context: 'AI Context System',
  reference_audio: 'Reference Audio Upload',
  daw_advanced: 'Advanced DAW Tools',
  stems: 'Stem Separation',
  multi_reference: 'Multi-Reference Blending',
  collaboration: 'Team Collaboration',
  wav_export: 'WAV Export',
  midi_export: 'MIDI Export',
};

const PLAN_BENEFITS: Record<string, string[]> = {
  pro: [
    'AI-powered field improvements',
    'Reference audio uploads',
    'Professional DAW tools',
    'Stem separation',
  ],
  studio: [
    'Creative Director AI mode',
    'Full AI context integration',
    'Advanced editing tools',
    'Multi-reference blending',
  ],
  enterprise: [
    'Team collaboration features',
    'Admin panel access',
    'Priority support',
    'Custom workflows',
  ],
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  requiredPlan,
  currentPlan,
}) => {
  const navigate = useNavigate();
  const featureName = FEATURE_NAMES[feature] || feature;
  const benefits = requiredPlan ? PLAN_BENEFITS[requiredPlan] : [];

  return (
    <Card className="border-dashed border-2 border-primary/20 bg-card/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Premium Feature</CardTitle>
            <CardDescription>
              {featureName} is available with {requiredPlan?.toUpperCase()} plan
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {benefits.slice(0, 3).map((benefit, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {idx === 0 && <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />}
            {idx === 1 && <Zap className="h-4 w-4 text-orange-500 flex-shrink-0" />}
            {idx === 2 && <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
            <span className="text-sm text-muted-foreground">{benefit}</span>
          </div>
        ))}
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full gap-2" 
          size="lg"
          onClick={() => navigate('/workspace/subscription')}
        >
          Upgrade to {requiredPlan?.toUpperCase()}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
