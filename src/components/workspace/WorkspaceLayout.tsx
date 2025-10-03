import { Outlet } from "react-router-dom";
import MinimalSidebar from "./MinimalSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";

const WorkspaceLayout = () => {

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Desktop only (visible >= 1024px) */}
      <div className="hidden lg:block">
        <MinimalSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
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

