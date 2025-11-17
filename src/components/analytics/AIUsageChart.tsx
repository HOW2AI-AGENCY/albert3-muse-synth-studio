/**
 * AI Usage Chart Component
 * Displays AI field improvement usage trends
 */

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/utils/logger';

interface AIUsageChartProps {
  timeRange: '7d' | '30d' | '90d';
}

interface ChartData {
  date: string;
  improve: number;
  generate: number;
  rewrite: number;
}

export const AIUsageChart = ({ timeRange }: AIUsageChartProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-usage-chart', timeRange],
    queryFn: async () => {
      // Mock data for now (TODO: Add AI usage tracking to database)
      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      
      const mockData: ChartData[] = [];
      
      for (let i = daysAgo - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        mockData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          improve: Math.floor(Math.random() * 10),
          generate: Math.floor(Math.random() * 5),
          rewrite: Math.floor(Math.random() * 3),
        });
      }

      logger.info('AI usage chart data loaded (mock)', 'AIUsageChart', { 
        dataPoints: mockData.length,
        timeRange 
      });

      return mockData;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
        No AI usage data available for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Bar 
          dataKey="improve" 
          fill="hsl(var(--primary))" 
          name="Improve"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="generate" 
          fill="hsl(var(--secondary))" 
          name="Generate"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="rewrite" 
          fill="hsl(var(--accent))" 
          name="Rewrite"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
