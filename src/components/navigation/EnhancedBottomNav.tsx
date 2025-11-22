import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Grid3x3, Home, Search, Library, Plus } from 'lucide-react';
import { HapticButton } from '@/components/ui/HapticButton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { getWorkspaceNavItems } from '@/config/workspace-navigation';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// Типы для расширенной навигации
interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  isVisible: boolean;
  priority: number; // 1 = primary, 2 = secondary, 3 = overflow
}

interface GenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'simple' | 'advanced';
  onModeChange: (mode: 'simple' | 'advanced') => void;
}

const GenerationPanel: React.FC<GenerationPanelProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange
}) => {
  const [selectedReference, setSelectedReference] = useState<'none' | 'audio' | 'persona' | 'project'>('none');

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[80vh]">
        <SheetHeader>
          <SheetTitle>Создать музыку</SheetTitle>
        </SheetHeader>

        <div className="flex gap-2 mb-4">
          <HapticButton
            variant={mode === 'simple' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('simple')}
          >
            Быстро
          </HapticButton>
          <HapticButton
            variant={mode === 'advanced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('advanced')}
          >
            Расширенно
          </HapticButton>
        </div>

        <div className="space-y-4">
          {/* Промпт */}
          <div>
            <label className="block text-sm font-medium mb-2">Описание</label>
            <textarea
              className="w-full p-3 rounded-lg border bg-background resize-none"
              rows={3}
              placeholder="Опишите желаемую музыку..."
            />
          </div>

          {/* Режимы генерации */}
          <div>
            <label className="block text-sm font-medium mb-2">Тип генерации</label>
            <div className="flex gap-2">
              <HapticButton variant="outline" size="sm">Продолжить</HapticButton>
              <HapticButton variant="outline" size="sm">Вариация</HapticButton>
              <HapticButton variant="outline" size="sm">С нуля</HapticButton>
            </div>
          </div>

          {/* Ссылка на референс */}
          {mode === 'advanced' && (
            <div>
              <label className="block text-sm font-medium mb-2">Референс</label>
              <div className="flex gap-2">
                <HapticButton
                  variant={selectedReference === 'audio' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedReference(selectedReference === 'audio' ? 'none' : 'audio')}
                >
                  Аудио
                </HapticButton>
                <HapticButton
                  variant={selectedReference === 'persona' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedReference(selectedReference === 'persona' ? 'none' : 'persona')}
                >
                  Персона
                </HapticButton>
                <HapticButton
                  variant={selectedReference === 'project' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedReference(selectedReference === 'project' ? 'none' : 'project')}
                >
                  Проект
                </HapticButton>
              </div>
            </div>
          )}

          {/* Дополнительные настройки для расширенного режима */}
          {mode === 'advanced' && selectedReference === 'none' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Стиль</label>
                <select className="w-full p-2 rounded-lg border bg-background">
                  <option>Поп</option>
                  <option>Рок</option>
                  <option>Электронная</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Длительность</label>
                <select className="w-full p-2 rounded-lg border bg-background">
                  <option>30 сек</option>
                  <option>1 мин</option>
                  <option>2 мин</option>
                </select>
              </div>
            </div>
          )}

          {/* Кнопка генерации */}
          <div className="pt-4">
            <HapticButton className="w-full" size="lg">
              Создать музыку
            </HapticButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const EnhancedBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { vibrate } = useHapticFeedback();
  const { isMobile } = useBreakpoints();

  // Состояние компонента
  const [isGenerationOpen, setIsGenerationOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState<'simple' | 'advanced'>('simple');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);

  // Базовые элементы навигации
  const baseNavItems: NavItem[] = useMemo(() => [
    {
      id: 'home',
      label: 'Главная',
      icon: Home,
      path: '/workspace',
      isVisible: true,
      priority: 1
    },
    {
      id: 'projects',
      label: 'Проекты',
      icon: Search,
      path: '/workspace/projects',
      isVisible: true,
      priority: 1
    },
    {
      id: 'generate',
      label: '+',
      icon: Plus,
      path: '#',
      isVisible: true,
      priority: 1
    },
    {
      id: 'library',
      label: 'Библиотека',
      icon: Library,
      path: '/workspace/library',
      isVisible: true,
      priority: 1
    },
    {
      id: 'more',
      label: 'Ещё',
      icon: Grid3x3,
      path: '#',
      isVisible: true,
      priority: 2
    }
  ], []);

  // Получаем все элементы навигации из конфига для меню "Ещё"
  const allNavItems = useMemo(() => getWorkspaceNavItems({ isAdmin }), [isAdmin]);

  // Фильтруем видимые элементы (макс 5)
  const visibleItems = useMemo(() => {
    return baseNavItems.filter(item => item.isVisible);
  }, [baseNavItems]);

  // Определяем активный элемент по пути
  const activeItemId = useMemo(() => {
    const currentPath = location.pathname;
    const bestMatch = visibleItems
      .filter(item => item.path !== '#' && currentPath.startsWith(item.path))
      .sort((a, b) => b.path.length - a.path.length)[0];

    return bestMatch?.id || 'home';
  }, [location.pathname, visibleItems]);



  // Обработчик клика по элементу
  const handleItemClick = useCallback((item: NavItem) => {
    if (item.id === 'generate') {
      vibrate('medium');
      setIsGenerationOpen(true);
    } else if (item.id === 'more') {
      vibrate('light');
      setIsMoreMenuOpen(true);
    } else {
      vibrate('light');
      navigate(item.path);
    }
  }, [navigate, vibrate]);



  // Не показываем на десктопе
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Нижняя навигация */}
      <div
        ref={navRef}
        data-bottom-tab-bar="true"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-bottom-nav p-2",
          "bg-background/80 backdrop-blur-xl border-t border-border/50",
          "pb-safe"
        )}
      >
        <nav className="menu relative">
          {visibleItems.map((item) => (
            <HapticButton
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                'menu__item',
                { active: activeItemId === item.id }
              )}
              onClick={() => handleItemClick(item)}
              aria-label={item.label}
              style={
                item.id === 'generate' ? {
                  '--component-active-color': 'var(--accent-purple)',
                } as React.CSSProperties : undefined
              }
            >
              <div className="menu__icon">
                <item.icon className="icon" />
              </div>
              <span className="menu__text">{item.label}</span>
            </HapticButton>
          ))}
        </nav>
      </div>

      {/* Панель генерации */}
      <GenerationPanel
        isOpen={isGenerationOpen}
        onClose={() => setIsGenerationOpen(false)}
        mode={generationMode}
        onModeChange={setGenerationMode}
      />

      {/* Меню "Ещё" */}
      <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Больше разделов</SheetTitle>
          </SheetHeader>
          <div
            className="grid gap-4 py-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))' }}
          >
            {allNavItems.flatMap(item => item.children ? [item, ...item.children] : [item])
              .filter(item => !visibleItems.some(v => v.id === item.id))
              .map((item) => (
                <HapticButton
                  key={item.id}
                  variant="ghost"
                  className="flex flex-col items-center justify-center gap-2 p-2 rounded-lg"
                  onClick={() => {
                    navigate(item.path);
                    setIsMoreMenuOpen(false);
                  }}
                >
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-center">{item.label}</span>
                </HapticButton>
              ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default EnhancedBottomNav;
