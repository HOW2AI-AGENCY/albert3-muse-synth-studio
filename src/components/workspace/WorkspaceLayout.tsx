import { useMemo, useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import MinimalSidebar from "./MinimalSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import AppBottomNav from "@/components/navigation/AppBottomNav";
import { NavigationTracker } from "@/components/NavigationTracker";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { getWorkspaceNavItems } from "@/config/workspace-navigation";
import { useWorkspaceOffsets } from "@/hooks/useWorkspaceOffsets";
import { OfflineBanner } from "@/components/common/OfflineBanner";

const WorkspaceLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { isAdmin } = useUserRole();
  const navigationItems = useMemo(
    () => getWorkspaceNavItems({ isAdmin }),
    [isAdmin]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarExpanded(prev => !prev);
  }, []);

  // Use dynamic offsets hook
  useWorkspaceOffsets();

  return (
    <NavigationTracker>
      <OfflineBanner />
      <div className="flex min-h-[100dvh] bg-background container-normal">
        {/* Sidebar - Desktop only */}
        <MinimalSidebar
          isExpanded={isSidebarExpanded}
          onToggle={toggleSidebar}
          items={navigationItems}
        />

        {/* Main Content */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 min-h-[100dvh] transition-all duration-300 workspace-content container-inline",
            isSidebarExpanded && "workspace-content--expanded"
          )}
        >
          <WorkspaceHeader className="safe-area-inset lg:block hidden" />

          <main
            className="workspace-main flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background scrollbar-styled will-change-transform"
            style={{
              paddingBottom: 'calc(var(--workspace-bottom-offset) + env(safe-area-inset-bottom, 0px))'
            }}
          >
            <Outlet />
          </main>

          {/* Bottom Tab Bar - Mobile only */}
          <AppBottomNav />
        </div>
      </div>
    </NavigationTracker>
  );
};

export default WorkspaceLayout;

