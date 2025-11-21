// src/components/analytics/GenreBreakdownChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GenreData {
  name: string;
  value: number;
}

interface GenreBreakdownChartProps {
  data: GenreData[];
}

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

/**
 * TODO: Добавить кастомный label для PieChart, чтобы избежать наложения текста при большом
 * количестве секторов или длинных названиях жанров.
 * Можно реализовать логику, которая будет выносить label наружу с линией-выноской,
 * если места внутри сектора недостаточно.
 */
const GenreBreakdownChart = ({ data }: GenreBreakdownChartProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Распределение по жанрам</CardTitle>
      <CardDescription>Топ жанров по прослушиваниям</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default GenreBreakdownChart;
