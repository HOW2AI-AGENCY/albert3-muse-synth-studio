import { useState } from "react";
import { Outlet } from "react-router-dom";
import MinimalSidebar from "./MinimalSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { cn } from "@/lib/utils";

const WorkspaceLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Desktop only (visible >= 1024px) */}
      <div className="hidden lg:block">
        <MinimalSidebar
          isExpanded={isSidebarExpanded}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        />
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-300",
        isSidebarExpanded ? "lg:pl-64" : "lg:pl-16"
      )}>
        <WorkspaceHeader className="safe-area-inset lg:block hidden" />
        
        <main className="flex-1 overflow-auto pb-[72px] lg:pb-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl">
            <Outlet />
          </div>
        </main>

        {/* Bottom Tab Bar - Mobile only */}
        <BottomTabBar />
      </div>
    </div>
  );
};

export default WorkspaceLayout;

