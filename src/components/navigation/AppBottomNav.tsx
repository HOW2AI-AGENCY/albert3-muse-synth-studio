import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Grid3x3, Plus, Home, Library, FolderOpen, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { getWorkspaceNavItems } from '@/config/workspace-navigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useBreakpoints } from '@/hooks/useBreakpoints';

const AppBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { vibrate } = useHapticFeedback();
  const { isMobile } = useBreakpoints();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isGenerateSheetOpen, setIsGenerateSheetOpen] = useState(false);

  // Hooks must be called before any conditional returns
  const allNavItems = useMemo(() => getWorkspaceNavItems({ isAdmin }), [isAdmin]);

  // Fixed navigation structure as requested
  const navStructure = useMemo(() => {
    const allItems = allNavItems.flatMap(item => item.children ? [item, ...item.children] : [item]);
    
    return {
      primary: [
        { id: 'home', label: 'Главная', icon: Home, path: '/workspace/dashboard' },
        { id: 'projects', label: 'Проекты', icon: FolderOpen, path: '/workspace/projects' },
        { id: 'generate', label: 'Создать', icon: Plus, path: '/workspace/generate', isCenter: true },
        { id: 'library', label: 'Библиотека', icon: Library, path: '/workspace/generate' },
        { id: 'more', label: 'Ещё', icon: Grid3x3, path: '' },
      ],
      overflow: allItems.filter(item => 
        !['dashboard', 'projects', 'generate'].includes(item.id)
      ),
    };
  }, [allNavItems]);

  const activeItemId = useMemo(() => {
    const currentPath = location.pathname;
    const match = navStructure.primary.find(item => 
      item.path && currentPath.startsWith(item.path)
    );
    return match?.id || 'home';
  }, [location.pathname, navStructure]);

  // Don't render on desktop/tablet - check AFTER all hooks
  if (!isMobile) {
    return null;
  }

  const handleItemClick = (path: string) => {
    vibrate('light');
    if (path) {
      navigate(path);
    }
    setIsMoreMenuOpen(false);
    setIsGenerateSheetOpen(false);
  };

  const onNavItemClick = (id: string) => {
    vibrate('light');
    const item = navStructure.primary.find(i => i.id === id);
    
    if (id === 'more') {
      setIsMoreMenuOpen(true);
    } else if (id === 'generate' && item?.isCenter) {
      setIsGenerateSheetOpen(true);
    } else if (item?.path) {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Modern mobile navbar with center FAB */}
      <div 
        data-bottom-tab-bar="true"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-bottom-nav",
          "bg-background/95 backdrop-blur-xl border-t border-border/30",
          "pb-safe"
        )}
      >
        <div className="relative flex items-center justify-around px-2 py-3">
          {navStructure.primary.map((item) => {
            const isActive = activeItemId === item.id;
            const isCenter = item.isCenter;
            
            if (isCenter) {
              return (
                <button
                  key={item.id}
                  onClick={() => onNavItemClick(item.id)}
                  className={cn(
                    "relative -mt-8 flex flex-col items-center justify-center",
                    "h-16 w-16 rounded-full",
                    "bg-gradient-to-br from-primary via-primary to-accent",
                    "shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.6)]",
                    "hover:scale-110 active:scale-95",
                    "transition-all duration-300 ease-out",
                    "touch-manipulation",
                    "group"
                  )}
                  aria-label={item.label}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <item.icon className="h-7 w-7 text-white relative z-10" strokeWidth={2.5} />
                  <span className="absolute -bottom-6 text-[10px] font-medium text-primary whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            }
            
            return (
              <button
                key={item.id}
                onClick={() => onNavItemClick(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3",
                  "min-w-[60px] rounded-xl",
                  "hover:bg-muted/50 active:scale-95",
                  "transition-all duration-200",
                  "touch-manipulation",
                  "group relative"
                )}
                aria-label={item.label}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-200",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon 
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {item.label}
                </span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate Sheet */}
      <Sheet open={isGenerateSheetOpen} onOpenChange={setIsGenerateSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] p-0">
          <SheetHeader className="p-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Создать трек
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(85vh-60px)] p-4">
            {/* This will be filled with MusicGenerator component */}
            <div className="text-center py-12 text-muted-foreground">
              <p>Здесь будет форма генерации</p>
              <p className="text-sm mt-2">Переход на /workspace/generate</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* More Menu Sheet */}
      <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Больше разделов</SheetTitle>
          </SheetHeader>
          <div
            className="grid gap-4 py-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))' }}
          >
            {navStructure.overflow.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl",
                  "hover:bg-muted active:scale-95 transition-all",
                  "touch-manipulation"
                )}
              >
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs text-center font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AppBottomNav;
