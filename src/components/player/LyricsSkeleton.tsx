import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LyricsSkeletonProps {
  className?: string;
}

export const LyricsSkeleton = ({ className }: LyricsSkeletonProps) => {
  return (
    <div className={cn("space-y-6 animate-pulse", className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-8 w-1/2 mx-auto" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-4/5 mx-auto" />
        <Skeleton className="h-8 w-2/3 mx-auto" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-8 w-1/2 mx-auto" />
      </div>
    </div>
  );
};
