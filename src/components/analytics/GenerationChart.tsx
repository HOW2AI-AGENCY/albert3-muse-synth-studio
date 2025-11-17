/**
 * Generation Chart Component
 * Displays generation trends over time using Recharts
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/utils/logger';

interface GenerationChartProps {
  timeRange: '7d' | '30d' | '90d';
}

interface ChartData {
  date: string;
  completed: number;
  failed: number;
  total: number;
}

export const GenerationChart = ({ timeRange }: GenerationChartProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['generation-chart', timeRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate date range
      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Fetch tracks
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('id, status, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch tracks for chart', error, 'GenerationChart');
        throw error;
      }

      // Group by date
      const dateMap = new Map<string, { completed: number; failed: number; total: number }>();

      // Initialize all dates in range
      for (let i = 0; i < daysAgo; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        dateMap.set(dateKey, { completed: 0, failed: 0, total: 0 });
      }

      // Populate with actual data
      tracks?.forEach(track => {
        const dateKey = track.created_at.split('T')[0];
        const existing = dateMap.get(dateKey) || { completed: 0, failed: 0, total: 0 };
        
        existing.total++;
        if (track.status === 'completed') existing.completed++;
        if (track.status === 'failed') existing.failed++;
        
        dateMap.set(dateKey, existing);
      });

      // Convert to array and sort
      const chartData: ChartData[] = Array.from(dateMap.entries())
        .map(([date, counts]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ...counts,
        }))
        .reverse();

      logger.info('Generation chart data loaded', 'GenerationChart', { 
        dataPoints: chartData.length,
        timeRange 
      });

      return chartData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
        No generation data available for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
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
        <Line 
          type="monotone" 
          dataKey="completed" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          name="Completed"
          dot={{ fill: 'hsl(var(--primary))' }}
        />
        <Line 
          type="monotone" 
          dataKey="failed" 
          stroke="hsl(var(--destructive))" 
          strokeWidth={2}
          name="Failed"
          dot={{ fill: 'hsl(var(--destructive))' }}
        />
        <Line 
          type="monotone" 
          dataKey="total" 
          stroke="hsl(var(--muted-foreground))" 
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Total"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
