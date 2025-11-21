import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Grid3x3 } from 'lucide-react';
import InteractiveMenu, { MenuItem } from '@/components/ui/InteractiveMenu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { getWorkspaceNavItems, WorkspaceNavItem } from '@/config/workspace-navigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useBreakpoints } from '@/hooks/useBreakpoints';

const AppBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { vibrate } = useHapticFeedback();
  const { isMobile } = useBreakpoints();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Hooks must be called before any conditional returns
  const allNavItems = useMemo(() => getWorkspaceNavItems({ isAdmin }), [isAdmin]);

  const { primaryItems, secondaryItems, overflowItems } = useMemo(() => {
    const flattenedItems = allNavItems.flatMap(item => item.children ? [item, ...item.children] : [item]);
    const mobilePrimary = flattenedItems.filter(item => item.isMobilePrimary);

    return {
      primaryItems: mobilePrimary.slice(0, 4),
      overflowItems: mobilePrimary.slice(4),
      secondaryItems: flattenedItems.filter(item => !item.isMobilePrimary),
    };
  }, [allNavItems]);

  const activeItemId = useMemo(() => {
    const currentPath = location.pathname;
    // Find the most specific match first
    const allItems = [...primaryItems, ...overflowItems, ...secondaryItems];
    const bestMatch = allItems
      .filter(item => currentPath.startsWith(item.path))
      .sort((a, b) => b.path.length - a.path.length)[0];
    return bestMatch?.id;
  }, [location.pathname, primaryItems, overflowItems, secondaryItems]);

  // Don't render on desktop/tablet - check AFTER all hooks
  if (!isMobile) {
    return null;
  }

  const mapToMenuItem = (item: WorkspaceNavItem): MenuItem => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
  });

  const handleItemClick = (path: string) => {
    navigate(path);
    setIsMoreMenuOpen(false);
  };

  const menuItems = primaryItems.map(mapToMenuItem);

  const hasOverflow = overflowItems.length > 0 || secondaryItems.length > 0;
  if (hasOverflow) {
    menuItems.push({
      id: 'more',
      label: 'Ещё',
      icon: Grid3x3, // Using the recommended icon
    });
  }

  const onMenuItemClick = (id: string) => {
    if (id === 'more') {
      vibrate('light');
      setIsMoreMenuOpen(true);
    } else {
      const item = allNavItems.find(i => i.id === id);
      if (item) {
        navigate(item.path);
      }
    }
  };

  return (
    <>
      {/* ✅ ДОБАВЛЕНО: data-bottom-tab-bar для useWorkspaceOffsets */}
      <div 
        data-bottom-tab-bar="true"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-bottom-nav p-2",
          "bg-background/80 backdrop-blur-xl border-t border-border/50",
          "pb-safe"
        )}
      >
        <InteractiveMenu
          items={menuItems}
          activeItem={activeItemId || ''}
          onItemClick={onMenuItemClick}
        />
      </div>

      <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Больше разделов</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {[...overflowItems, ...secondaryItems].map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.path)}
                className="flex flex-col items-center justify-center gap-2 p-2 rounded-lg hover:bg-muted active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-xs text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AppBottomNav;
