import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

const WorkspaceHeader = () => {
  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold">MusicAI Pro</h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default WorkspaceHeader;
