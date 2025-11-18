import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  color?: string; // e.g., 'hsl(var(--primary))'
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
  const activeMenuItem = items.find(item => item.id === activeItem);

  return (
    <nav className={cn('w-full', className)}>
      <div className="menu relative">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
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
