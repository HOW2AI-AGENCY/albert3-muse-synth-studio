import { useState } from "react";
import { Outlet } from "react-router-dom";
import MinimalSidebar from "./MinimalSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { cn } from "@/lib/utils";

const WorkspaceLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop only */}
      <MinimalSidebar
        isExpanded={isSidebarExpanded}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 ml-0 lg:ml-16">
        <WorkspaceHeader className="safe-area-inset lg:block hidden" />
        
        <main className="flex-1 overflow-y-auto pb-[72px] lg:pb-0 bg-gradient-to-br from-background via-background to-accent/5 scrollbar-styled">
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

