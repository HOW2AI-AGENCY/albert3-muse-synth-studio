/**
 * Metric Bar Component
 * Progress bar for displaying metrics
 */

import { Progress } from '@/components/ui/progress';

interface MetricBarProps {
  label: string;
  value: number;
  max: number;
}

export const MetricBar = ({ label, value, max }: MetricBarProps) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
};
