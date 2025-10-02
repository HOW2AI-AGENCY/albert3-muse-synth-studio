import { Outlet } from "react-router-dom";
import MinimalSidebar from "./MinimalSidebar";
import WorkspaceHeader from "./WorkspaceHeader";

const WorkspaceLayout = () => {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <MinimalSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <WorkspaceHeader />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default WorkspaceLayout;
