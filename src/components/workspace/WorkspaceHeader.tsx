import { Search } from "@/utils/iconImports";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProviderHealthIndicator } from "@/components/mureka/ProviderHealthIndicator";
import { motion } from "framer-motion";
import { memo } from "react";

interface WorkspaceHeaderProps {
  className?: string;
}

const WorkspaceHeader = memo(({ className }: WorkspaceHeaderProps) => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        "flex h-14 items-center justify-between border-b border-border/40 bg-background/98 px-4 sm:px-6 backdrop-blur-xl shadow-sm",
        "bg-gradient-to-r from-background via-background to-background/95",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        <motion.div 
          className="relative hidden w-full max-w-sm sm:block"
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" aria-hidden="true" />
          <Input
            placeholder="Поиск по библиотеке..."
            className="h-10 w-full rounded-lg border-border/40 bg-muted/40 pl-9 pr-4 transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-background"
          />
        </motion.div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <ProviderHealthIndicator className="mr-2" />
        
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden hover:bg-primary/10 transition-colors"
          aria-label="Открыть поиск"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>
    </motion.header>
  );
});

WorkspaceHeader.displayName = 'WorkspaceHeader';

export default WorkspaceHeader;
