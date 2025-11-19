import React from 'react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  color?: string;
}

interface InteractiveMenuProps {
  items: MenuItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  className?: string;
}

const InteractiveMenu: React.FC<InteractiveMenuProps> = ({
  items,
  activeItem,
  onItemClick,
  className,
}) => {
  const { vibrate } = useHapticFeedback();

  const handleClick = (id: string) => {
    vibrate('light');
    onItemClick(id);
  };

  return (
    <nav className={cn('w-full', className)}>
      <div className="menu relative">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={cn(
              'menu__item',
              { active: activeItem === item.id }
            )}
            style={
              {
                '--component-active-color': item.color,
              } as React.CSSProperties
            }
          >
            <div className="menu__icon">
              <item.icon className="icon" />
            </div>
            <span className="menu__text">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default InteractiveMenu;
