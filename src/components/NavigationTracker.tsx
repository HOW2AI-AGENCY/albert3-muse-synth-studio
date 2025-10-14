/**
 * ✅ Phase 4: Navigation Tracking Component
 * Wrapper компонент для відстеження навігації
 */

import { useNavigationTracking } from '@/hooks/useNavigationTracking';

export const NavigationTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useNavigationTracking();
  return <>{children}</>;
};
