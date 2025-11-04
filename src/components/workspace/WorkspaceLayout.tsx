import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import MinimalSidebar from "./MinimalSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { NavigationTracker } from "@/components/NavigationTracker";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { getWorkspaceNavItems } from "@/config/workspace-navigation";
import { useWorkspaceOffsets } from "@/hooks/useWorkspaceOffsets";

const WorkspaceLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { isAdmin } = useUserRole();
  const navigationItems = useMemo(
    () => getWorkspaceNavItems({ isAdmin }),
    [isAdmin]
  );

  // Use dynamic offsets hook
  useWorkspaceOffsets();

  return (
    <NavigationTracker>
      <div className="flex min-h-screen min-h-[100dvh] bg-background">
        {/* Sidebar - Desktop only */}
        <MinimalSidebar
          isExpanded={isSidebarExpanded}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
          items={navigationItems}
        />

        {/* Main Content */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 min-h-[100dvh] transition-all duration-300",
            isSidebarExpanded ? "ml-0 lg:ml-sidebar-expanded" : "ml-0 lg:ml-sidebar-collapsed"
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
          <BottomTabBar items={navigationItems} />
        </div>
      </div>
    </NavigationTracker>
  );
};

export default WorkspaceLayout;

