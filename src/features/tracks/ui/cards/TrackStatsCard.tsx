/**
 * Track Statistics Card
 * Display play count, like count, view count, download count
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Heart, Eye, Download } from 'lucide-react';

interface TrackStatsCardProps {
  playCount?: number | null;
  likeCount?: number | null;
  viewCount?: number | null;
  downloadCount?: number | null;
}

const formatCount = (count?: number) => {
  if (!count || count === 0) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const TrackStatsCard = ({
  playCount = 0,
  likeCount = 0,
  viewCount = 0,
  downloadCount = 0,
}: TrackStatsCardProps) => {
  const stats = [
    { label: 'Прослушиваний', value: playCount ?? 0, icon: BarChart3, color: 'text-blue-500' },
    { label: 'Лайков', value: likeCount ?? 0, icon: Heart, color: 'text-red-500' },
    { label: 'Просмотров', value: viewCount ?? 0, icon: Eye, color: 'text-green-500' },
    { label: 'Скачиваний', value: downloadCount ?? 0, icon: Download, color: 'text-purple-500' },
  ];

  return (
    <Card className="bg-muted/30 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Статистика
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center p-3 rounded-lg bg-background/50">
              <div className={`flex items-center gap-1.5 mb-1 ${stat.color}`}>
                <stat.icon className="h-3.5 w-3.5" />
                <span className="text-lg font-bold tabular-nums">
                  {formatCount(stat.value)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
