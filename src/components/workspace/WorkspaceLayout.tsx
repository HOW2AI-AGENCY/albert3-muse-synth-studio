import { useMemo, useState, useEffect } from "react";
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

  // Update CSS variable for player offset
  useEffect(() => {
    const updatePlayerOffset = () => {
      const player = document.querySelector('[data-testid="mini-player"]') as HTMLElement;
      const height = player ? player.offsetHeight : 0;
      document.documentElement.style.setProperty(
        '--workspace-bottom-offset',
        `${height}px`
      );
    };

    updatePlayerOffset();
    
    // Watch for DOM changes
    const observer = new MutationObserver(updatePlayerOffset);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Also update on resize
    window.addEventListener('resize', updatePlayerOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePlayerOffset);
    };
  }, []);

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
          isSidebarExpanded ? "ml-0 lg:ml-52" : "ml-0 lg:ml-14"
        )}
      >
        <WorkspaceHeader className="safe-area-inset lg:block hidden" />

        <main
          className="workspace-main flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background scrollbar-styled"
          style={{
            paddingBottom: 'var(--workspace-bottom-offset)'
          }}
          data-player-active={false}
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

