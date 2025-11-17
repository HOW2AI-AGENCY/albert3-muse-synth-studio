/**
 * Stats Grid Component
 * Display track statistics in a 2x2 grid
 */

import { Play, Heart, Download, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsGridProps {
  playCount: number;
  likeCount: number;
  downloadCount: number;
  viewCount: number;
}

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const StatsGrid = ({ playCount, likeCount, downloadCount, viewCount }: StatsGridProps) => {
  const stats = [
    { icon: Play, label: 'Прослушивания', value: playCount, color: 'text-blue-500' },
    { icon: Heart, label: 'Лайки', value: likeCount, color: 'text-red-500' },
    { icon: Download, label: 'Скачивания', value: downloadCount, color: 'text-green-500' },
    { icon: Eye, label: 'Просмотры', value: viewCount, color: 'text-purple-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-muted/30 border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-lg font-semibold tabular-nums">{formatCount(stat.value)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
