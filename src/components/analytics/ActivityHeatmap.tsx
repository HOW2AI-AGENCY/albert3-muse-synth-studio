/**
 * Activity Heatmap Component
 * Shows user activity patterns by day and hour
 */

interface ActivityHeatmapProps {
  timeRange: '7d' | '30d' | '90d';
}

export const ActivityHeatmap = (_props: ActivityHeatmapProps) => {
  // TODO: Implement heatmap visualization
  return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-muted-foreground">Activity Heatmap</p>
        <p className="text-sm text-muted-foreground">Coming soon in next update</p>
      </div>
    </div>
  );
};
