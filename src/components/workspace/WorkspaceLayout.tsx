import { Outlet } from "react-router-dom";
import { useState } from "react";
import MinimalSidebar from "./MinimalSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { cn } from "@/lib/utils";

const WorkspaceLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
        "lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <MinimalSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <WorkspaceHeader 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          className="safe-area-inset"
        />
        
        <main className="flex-1 overflow-auto pb-16 lg:pb-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
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

