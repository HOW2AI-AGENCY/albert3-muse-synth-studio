/**
 * ContestSection Component
 *
 * Displays remix contests in the Home/Feed page
 * Shows featured and active contests with participation info
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useCallback } from 'react';
import { Trophy, Users, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ContestSectionProps, ContestInfo } from '@/types/suno-ui.types';

/**
 * Format deadline to human-readable format
 */
const formatDeadline = (deadline: string): string => {
  const date = new Date(deadline);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Ended';
  if (diffDays === 0) return 'Ends today';
  if (diffDays === 1) return 'Ends tomorrow';
  if (diffDays < 7) return `${diffDays} days left`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks left`;
  return date.toLocaleDateString();
};

/**
 * Individual Contest Card
 */
const ContestCard = memo<{
  contest: ContestInfo;
  onSelect?: (id: string) => void;
}>(({ contest, onSelect }) => {
  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(contest.id);
    }
  }, [contest.id, onSelect]);

  const daysLeft = Math.ceil(
    (new Date(contest.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isEnding = daysLeft <= 3 && daysLeft > 0;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 cursor-pointer',
        'hover:shadow-xl hover:-translate-y-1',
        contest.featured &&
          'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      onClick={handleClick}
    >
      {/* Featured Badge */}
      {contest.featured && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm gap-1">
            <Sparkles className="w-3 h-3" />
            Featured
          </Badge>
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10">
        {contest.thumbnailUrl ? (
          <img
            src={contest.thumbnailUrl}
            alt={contest.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Trophy className="w-16 h-16 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Deadline Overlay */}
        <div
          className={cn(
            'absolute bottom-3 left-3 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm',
            isEnding
              ? 'bg-red-500/90 text-white animate-pulse'
              : 'bg-black/60 text-white'
          )}
        >
          <Calendar className="w-3 h-3 inline mr-1" />
          {formatDeadline(contest.deadline)}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
          {contest.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {contest.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          {contest.prizePool && (
            <div className="flex items-center gap-1 font-semibold text-primary">
              <Trophy className="w-4 h-4" />
              <span>{contest.prizePool}</span>
            </div>
          )}
          {contest.participantCount !== undefined && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{contest.participantCount} participants</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <Button
          variant="outline"
          size="sm"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          View Contest
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
});

ContestCard.displayName = 'ContestCard';

/**
 * Contest Section
 */
export const ContestSection = memo<ContestSectionProps>(({
  contests,
  isLoading = false,
  onSelectContest,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-video bg-muted animate-pulse rounded-lg" />
              <div className="space-y-2">
                <div className="h-6 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (contests.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">No Active Contests</h3>
        <p className="text-muted-foreground">
          Check back soon for new remix contests and opportunities!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-primary" />
            Remix Contests
          </h2>
          <p className="text-muted-foreground">
            Compete, win prizes, and showcase your talent
          </p>
        </div>

        {contests.length > 6 && (
          <Button variant="ghost" className="hidden md:flex">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Contest Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contests.map((contest) => (
          <ContestCard
            key={contest.id}
            contest={contest}
            onSelect={onSelectContest}
          />
        ))}
      </div>

      {/* Mobile View All */}
      {contests.length > 6 && (
        <Button variant="outline" className="w-full md:hidden">
          View All Contests
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
});

ContestSection.displayName = 'ContestSection';
