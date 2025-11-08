import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Music, 
  Mic, 
  Settings, 
  User, 
  Menu, 
  X, 
  ChevronRight,
  Search,
  Heart,
  Download,
  Share2 as Share
} from '@/utils/iconImports';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  href?: string;
  onClick?: () => void;
}

interface DrawerItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  children?: DrawerItem[];
}

interface MobileNavigationProps {
  tabs: TabItem[];
  drawerItems?: DrawerItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

/**
 * 📱 MobileNavigation - Нативная мобильная навигация
 * 
 * Особенности:
 * - Фиксированная нижняя панель (tab bar) в стиле iOS/Android
 * - Выдвижное боковое меню с жестовым управлением
 * - Haptic feedback для взаимодействий
 * - Плавные анимации 60fps
 * - Поддержка безопасных зон
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  tabs,
  drawerItems = [],
  activeTab,
  onTabChange,
  className,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Haptic feedback (если поддерживается)
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      };
      navigator.vibrate(patterns[type]);
    }
  };

  // Обработка жестов для drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStartX(touch.clientX);
    setDragCurrentX(touch.clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    setDragCurrentX(touch.clientX);
    
    const deltaX = touch.clientX - dragStartX;
    
    if (isDrawerOpen) {
      // Закрытие drawer свайпом влево
      if (deltaX < -50 && drawerRef.current) {
        const progress = Math.max(0, 1 + deltaX / 280);
        drawerRef.current.style.transform = `translateX(${deltaX}px)`;
        if (overlayRef.current) {
          overlayRef.current.style.opacity = `${progress}`;
        }
      }
    } else {
      // Открытие drawer свайпом вправо от левого края
      if (dragStartX < 20 && deltaX > 20 && drawerRef.current) {
        const progress = Math.min(1, deltaX / 280);
        drawerRef.current.style.transform = `translateX(${-280 + deltaX}px)`;
        if (overlayRef.current) {
          overlayRef.current.style.opacity = `${progress}`;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaX = dragCurrentX - dragStartX;
    
    if (isDrawerOpen && deltaX < -100) {
      closeDrawer();
    } else if (!isDrawerOpen && dragStartX < 20 && deltaX > 100) {
      openDrawer();
    } else {
      // Возврат в исходное положение
      if (drawerRef.current) {
        drawerRef.current.style.transform = isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)';
      }
      if (overlayRef.current) {
        overlayRef.current.style.opacity = isDrawerOpen ? '1' : '0';
      }
    }
    
    setIsDragging(false);
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    triggerHaptic('light');
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    triggerHaptic('light');
  };

  const handleTabClick = (tab: TabItem) => {
    triggerHaptic('light');
    onTabChange?.(tab.id);
    tab.onClick?.();
  };

  // Закрытие drawer при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDrawerOpen && drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        closeDrawer();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDrawerOpen]);

  // Блокировка прокрутки body при открытом drawer
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        style={{ zIndex: 'var(--z-drawer)' }} /* Use unified z-index system */
        onClick={closeDrawer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Side Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed top-0 left-0 h-full w-80 bg-surface border-r border-outline-variant',
          'transform transition-transform duration-300 ease-out',
          'shadow-elevation-3',
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ zIndex: 'var(--z-drawer)' }} /* Use unified z-index system */
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface">Меню</h2>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-full hover:bg-surface-variant transition-colors"
            aria-label="Закрыть меню"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {drawerItems.map((item) => (
            <DrawerMenuItem key={item.id} item={item} onClose={closeDrawer} />
          ))}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-outline-variant">
          <div className="text-xs text-on-surface-variant text-center">
            Albert3 Muse Synth Studio
          </div>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0',
          'bg-surface/95 backdrop-blur-md border-t border-outline-variant',
          'safe-area-bottom',
          className
        )}
        style={{ zIndex: 'var(--z-bottom-nav)' }} /* Use unified z-index system */
      >
        <div className="flex items-center justify-around px-2 py-1">
          {/* Menu Button */}
          <button
            onClick={openDrawer}
            className={cn(
              'flex flex-col items-center justify-center p-2 rounded-lg',
              'min-h-[48px] min-w-[48px]',
              'transition-all duration-200 ease-out',
              'hover:bg-surface-variant active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
            aria-label="Открыть меню"
          >
            <Menu className="w-6 h-6 text-on-surface-variant mb-1" />
            <span className="text-xs text-on-surface-variant">Меню</span>
          </button>

          {/* Tab Items */}
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-lg relative',
                  'min-h-[48px] min-w-[48px]',
                  'transition-all duration-200 ease-out',
                  'hover:bg-surface-variant active:scale-95',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20',
                  isActive && 'bg-primary-container'
                )}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Badge */}
                {tab.badge && tab.badge > 0 && (
                  <div className="absolute -top-1 -right-1 bg-error text-on-error text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </div>
                )}

                <Icon 
                  className={cn(
                    'w-6 h-6 mb-1 transition-colors duration-200',
                    isActive ? 'text-on-primary-container' : 'text-on-surface-variant'
                  )} 
                />
                <span 
                  className={cn(
                    'text-xs transition-colors duration-200',
                    isActive ? 'text-on-primary-container font-medium' : 'text-on-surface-variant'
                  )}
                >
                  {tab.label}
                </span>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

/**
 * 📋 DrawerMenuItem - Элемент бокового меню
 */
interface DrawerMenuItemProps {
  item: DrawerItem;
  onClose: () => void;
  level?: number;
}

const DrawerMenuItem: React.FC<DrawerMenuItemProps> = ({ item, onClose, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      item.onClick?.();
      onClose();
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center px-4 py-3 text-left',
          'hover:bg-surface-variant transition-colors duration-200',
          'focus:outline-none focus:bg-surface-variant',
          level > 0 && 'pl-8'
        )}
      >
        <Icon className="w-5 h-5 text-on-surface-variant mr-3 flex-shrink-0" />
        <span className="flex-1 text-on-surface">{item.label}</span>
        {hasChildren && (
          <ChevronRight 
            className={cn(
              'w-4 h-4 text-on-surface-variant transition-transform duration-200',
              isExpanded && 'rotate-90'
            )} 
          />
        )}
      </button>

      {/* Submenu */}
      {hasChildren && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-out',
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          {item.children?.map((child) => (
            <DrawerMenuItem
              key={child.id}
              item={child}
              onClose={onClose}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 🎯 Предустановленные конфигурации навигации
 */

// Основные вкладки для музыкального приложения
// Предустановки вынесены в отдельный модуль: './mobilePresets'

export default MobileNavigation;