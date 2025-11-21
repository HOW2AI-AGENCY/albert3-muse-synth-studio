// src/components/analytics/ActivityChart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartDataPoint {
  date: string;
  views: number;
  plays: number;
  likes: number;
}

interface ActivityChartProps {
  data: ChartDataPoint[];
}

/**
 * FIX-ME: Этот компонент можно дополнительно оптимизировать.
 * Например, вынести конфигурацию графиков (стили, ключи) в константы,
 * чтобы сделать код более читаемым и управляемым.
 * Также стоит рассмотреть возможность использования кастомных хуков
 * для более сложных взаимодействий с графиками в будущем.
 */
const ActivityChart = ({ data }: ActivityChartProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Динамика активности</CardTitle>
      <CardDescription>Просмотры, прослушивания и лайки за период</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
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
            dataKey="views"
            stroke="#3b82f6"
            name="Просмотры"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="plays"
            stroke="#10b981"
            name="Прослушивания"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="likes"
            stroke="#ef4444"
            name="Лайки"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default ActivityChart;
