import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import MinimalSidebar from "./MinimalSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { getWorkspaceNavItems } from "@/config/workspace-navigation";

const WorkspaceLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { isAdmin } = useUserRole();
  const navigationItems = useMemo(
    () => getWorkspaceNavItems({ isAdmin }),
    [isAdmin]
  );

  return (
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
          isSidebarExpanded ? "ml-0 lg:ml-64" : "ml-0 lg:ml-16"
        )}
      >
        <WorkspaceHeader className="safe-area-inset lg:block hidden" />

        <main
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[72px] supports-[padding:env(safe-area-inset-bottom)]:pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0 bg-background scrollbar-styled"
        >
          <Outlet />
        </main>

        {/* Bottom Tab Bar - Mobile only */}
        <BottomTabBar items={navigationItems} />
      </div>
    </div>
  );
};

export default WorkspaceLayout;

