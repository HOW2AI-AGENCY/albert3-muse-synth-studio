import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, LayoutGrid } from 'lucide-react';
import InteractiveMenu, { MenuItem } from '@/components/ui/InteractiveMenu';
import { cn } from '@/lib/utils';

const AppBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = useMemo<MenuItem[]>(() => [
    { id: 'home', label: 'Главная', icon: Home, color: 'hsl(var(--accent-purple))' },
    { id: 'artists', label: 'Артисты', icon: Users, color: 'hsl(var(--accent-blue))' },
    { id: 'projects', label: 'Проекты', icon: LayoutGrid, color: 'hsl(var(--accent-green))' },
  ], []);

  const pathToIdMap: { [key: string]: string } = {
    '/workspace/dashboard': 'home',
    '/workspace/artists': 'artists',
    '/workspace/projects': 'projects',
  };

  // Find the most specific match for the active item
  const activeItem = Object.keys(pathToIdMap)
    .sort((a, b) => b.length - a.length) // Sort by path length descending
    .find(path => location.pathname.startsWith(path));

  const activeId = activeItem ? pathToIdMap[activeItem] : 'home';

  const handleItemClick = (id: string) => {
    switch (id) {
      case 'home':
        navigate('/workspace/dashboard');
        break;
      case 'artists':
        navigate('/workspace/artists');
        break;
      case 'projects':
        navigate('/workspace/projects');
        break;
    }
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 p-2",
      "bg-background/80 backdrop-blur-xl border-t border-border/50",
      "pb-safe" // Utility class for safe area padding
    )}>
      <InteractiveMenu
        items={menuItems}
        activeItem={activeId}
        onItemClick={handleItemClick}
      />
    </div>
  );
};

export default AppBottomNav;
