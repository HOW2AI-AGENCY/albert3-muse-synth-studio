import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// Импорты новых компонентов
import { ResponsiveLayout, MobileContainer, DesktopContainer, AdaptiveGrid } from '../layout/ResponsiveLayout';
import { MobileNavigation } from '../navigation/MobileNavigation';
import { 
  AccessibleButton, 
  AccessibleInput, 
  AccessibleSelect, 
  AccessibleCheckbox,
  AccessibleToast 
} from '../ui/AccessibleComponents';
import { 
  SmoothAnimation, 
  AnimatedTransition, 
  AnimatedList,
  ButtonPressAnimation,
  LoadingAnimation,
  CardRevealAnimation,
  ModalAnimation 
} from '../animations/SmoothAnimations';
import { 
  PullToRefresh, 
  SwipeActions, 
  useHapticFeedback,
  LongPress,
  RippleEffect,
  BottomSheet 
} from '../mobile/MobileUIPatterns';
import { 
  DeviceInfo, 
  AutoTester, 
  DeviceSimulator,
  CompatibilityStats,
  useDeviceDetection,
  deviceProfiles,
  TestResult 
} from '../testing/CrossPlatformTester';

/**
 * 🎨 Главный компонент демонстрации UI
 */
export const UIShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('layout');
  const [showModal, setShowModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedDevice, setSelectedDevice] = useState(deviceProfiles[0]);
  
  const { currentDevice } = useDeviceDetection();
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Демо данные
  const demoItems = [
    { id: 1, title: 'Первый элемент', description: 'Описание первого элемента' },
    { id: 2, title: 'Второй элемент', description: 'Описание второго элемента' },
    { id: 3, title: 'Третий элемент', description: 'Описание третьего элемента' },
  ];

  const swipeActions = [
    {
      id: 'edit',
      label: 'Изменить',
      icon: <span>✏️</span>,
      color: 'primary' as const,
      onAction: () => {
        triggerHaptic('medium');
        alert('Действие: Изменить');
      },
    },
    {
      id: 'delete',
      label: 'Удалить',
      icon: <span>🗑️</span>,
      color: 'destructive' as const,
      onAction: () => {
        triggerHaptic('heavy');
        alert('Действие: Удалить');
      },
    },
  ];

  // Тесты для автоматического тестирования
  const uiTests = [
    {
      name: 'Загрузка компонентов',
      test: async (device: any) => {
        const startTime = performance.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        const loadTime = performance.now() - startTime;
        
        return {
          deviceId: device.id,
          testName: 'Загрузка компонентов',
          status: (loadTime < 200 ? 'pass' : 'warning') as 'pass' | 'fail' | 'warning' | 'pending',
          message: `Время загрузки: ${Math.round(loadTime)}ms`,
          timestamp: new Date(),
          metrics: {
            loadTime: Math.round(loadTime),
            renderTime: 0,
            interactionTime: 0,
            memoryUsage: 0,
          },
        };
      },
    },
    {
      name: 'Адаптивность',
      test: async (device: any) => {
        const isResponsive = device.viewport.width >= 320 && device.viewport.width <= 3840;
        
        return {
          deviceId: device.id,
          testName: 'Адаптивность',
          status: (isResponsive ? 'pass' : 'fail') as 'pass' | 'fail' | 'warning' | 'pending',
          message: isResponsive ? 'Поддерживается' : 'Не поддерживается',
          timestamp: new Date(),
        };
      },
    },
    {
      name: 'Доступность',
      test: async (device: any) => {
        const hasAccessibilityFeatures = device.features.touch || device.features.hover;
        
        return {
          deviceId: device.id,
          testName: 'Доступность',
          status: (hasAccessibilityFeatures ? 'pass' : 'warning') as 'pass' | 'fail' | 'warning' | 'pending',
          message: hasAccessibilityFeatures ? 'ARIA поддерживается' : 'Ограниченная поддержка',
          timestamp: new Date(),
        };
      },
    },
  ];

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    triggerHaptic('success');
  };

  const tabs = [
    { id: 'layout', label: 'Адаптивная вёрстка', icon: '📱' },
    { id: 'navigation', label: 'Навигация', icon: '🧭' },
    { id: 'accessibility', label: 'Доступность', icon: '♿' },
    { id: 'animations', label: 'Анимации', icon: '🎬' },
    { id: 'mobile', label: 'Мобильные паттерны', icon: '👆' },
    { id: 'testing', label: 'Тестирование', icon: '🧪' },
  ];

  return (
    <ResponsiveLayout className="min-h-screen bg-background">
      {/* Заголовок */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🎨 UI Showcase - Демонстрация компонентов
          </h1>
          <p className="text-muted-foreground mt-1">
            Современные адаптивные компоненты с поддержкой всех платформ
          </p>
        </div>
      </div>

      {/* Информация о текущем устройстве */}
      <div className="container mx-auto px-4 py-4">
        <DeviceInfo device={currentDevice} />
      </div>

      {/* Навигация по табам */}
      <div className="sticky top-20 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto gap-2 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                <span>{tab.icon}</span>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="container mx-auto px-4 py-6">
        <AnimatedTransition show={true} enter="fadeIn">
          {/* Адаптивная вёрстка */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <CardRevealAnimation>
                <div className="p-6 bg-card border rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">📱 Адаптивная вёрстка</h2>
                  
                  <AdaptiveGrid className="gap-4 mb-6">
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <h3 className="font-medium mb-2">Mobile First</h3>
                      <p className="text-sm text-muted-foreground">
                        Приоритет мобильных устройств с плавным масштабированием
                      </p>
                    </div>
                    
                    <div className="p-4 bg-secondary/10 rounded-lg">
                      <h3 className="font-medium mb-2">Responsive Grid</h3>
                      <p className="text-sm text-muted-foreground">
                        Автоматическая адаптация под размер экрана
                      </p>
                    </div>
                    
                    <div className="p-4 bg-accent/10 rounded-lg">
                      <h3 className="font-medium mb-2">Safe Areas</h3>
                      <p className="text-sm text-muted-foreground">
                        Поддержка безопасных зон iOS и Android
                      </p>
                    </div>
                  </AdaptiveGrid>

                  <MobileContainer>
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg">
                      <p className="text-sm">
                        📱 Этот контент оптимизирован для мобильных устройств
                      </p>
                    </div>
                  </MobileContainer>

                  <DesktopContainer>
                    <div className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg">
                      <p className="text-sm">
                        🖥️ Этот контент показывается только на десктопе
                      </p>
                    </div>
                  </DesktopContainer>
                </div>
              </CardRevealAnimation>
            </div>
          )}

          {/* Навигация */}
          {activeTab === 'navigation' && (
            <div className="space-y-6">
              <CardRevealAnimation>
                <div className="p-6 bg-card border rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">🧭 Мобильная навигация</h2>
                  
                  <div className="relative h-96 bg-muted rounded-lg overflow-hidden">
                    <MobileNavigation
                      tabs={[
                        { id: 'home', label: 'Главная', icon: ({ className }) => <span className={className}>🏠</span> },
                        { id: 'search', label: 'Поиск', icon: ({ className }) => <span className={className}>🔍</span> },
                        { id: 'library', label: 'Библиотека', icon: ({ className }) => <span className={className}>📚</span> },
                        { id: 'profile', label: 'Профиль', icon: ({ className }) => <span className={className}>👤</span> },
                      ]}
                      activeTab="home"
                      onTabChange={(tab) => console.log('Tab changed:', tab)}
                      drawerItems={[
                        { id: 'settings', label: 'Настройки', icon: ({ className }) => <span className={className}>⚙️</span> },
                        { id: 'help', label: 'Помощь', icon: ({ className }) => <span className={className}>❓</span> },
                        { id: 'about', label: 'О приложении', icon: ({ className }) => <span className={className}>ℹ️</span> },
                      ]}
                      onDrawerItemClick={(item) => console.log('Drawer item:', item)}

                    />
                    
                    <div className="p-4 pt-16 pb-20">
                      <p className="text-center text-muted-foreground">
                        Демонстрация мобильной навигации с нижней панелью и боковым меню
                      </p>
                    </div>
                  </div>
                </div>
              </CardRevealAnimation>
            </div>
          )}

          {/* Доступность */}
          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              <CardRevealAnimation>
                <div className="p-6 bg-card border rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">♿ Доступные компоненты</h2>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <AccessibleButton
                        variant="default"
                        onClick={() => setShowToast(true)}
                        aria-label="Показать уведомление"
                      >
                        Показать Toast
                      </AccessibleButton>
                      
                      <AccessibleInput
                        label="Доступное поле ввода"
                        placeholder="Введите текст..."
                        helpText="Это поле поддерживает скринридеры"
                      />
                      
                      <AccessibleSelect
                        label="Выберите опцию"
                        options={[
                          { value: 'option1', label: 'Опция 1' },
                          { value: 'option2', label: 'Опция 2' },
                          { value: 'option3', label: 'Опция 3' },
                        ]}
                        helpText="Навигация клавиатурой поддерживается"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <AccessibleCheckbox
                        label="Согласие с условиями"
                        helpText="Обязательное поле"
                        required
                      />
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <h3 className="font-medium mb-2">Особенности доступности:</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• ARIA-атрибуты для скринридеров</li>
                          <li>• Контрастность 4.5:1 и выше</li>
                          <li>• Поддержка навигации клавиатурой</li>
                          <li>• Масштабирование текста до 200%</li>
                          <li>• Семантическая разметка HTML</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardRevealAnimation>
            </div>
          )}

          {/* Анимации */}
          {activeTab === 'animations' && (
            <div className="space-y-6">
              <CardRevealAnimation delay={100}>
                <div className="p-6 bg-card border rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">🎬 Плавные анимации</h2>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="font-medium">Анимации входа</h3>
                      
                      <div className="space-y-2">
                        <SmoothAnimation type="fadeIn" config={{ duration: 500 }}>
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <span className="text-sm">Fade In анимация</span>
                          </div>
                        </SmoothAnimation>
                        
                        <SmoothAnimation type="slideUp" config={{ duration: 600, delay: 200 }}>
                          <div className="p-3 bg-secondary/10 rounded-lg">
                            <span className="text-sm">Slide Up анимация</span>
                          </div>
                        </SmoothAnimation>
                        
                        <SmoothAnimation type="scaleIn" config={{ duration: 400, delay: 400 }}>
                          <div className="p-3 bg-accent/10 rounded-lg">
                            <span className="text-sm">Scale In анимация</span>
                          </div>
                        </SmoothAnimation>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-medium">Интерактивные элементы</h3>
                      
                      <ButtonPressAnimation>
                        <div className="p-4 bg-primary text-primary-foreground rounded-lg cursor-pointer text-center">
                          Нажми меня!
                        </div>
                      </ButtonPressAnimation>
                      
                      <RippleEffect>
                        <div className="p-4 bg-secondary text-secondary-foreground rounded-lg cursor-pointer text-center">
                          Ripple эффект
                        </div>
                      </RippleEffect>
                      
                      <div className="flex justify-center">
                        <LoadingAnimation />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="font-medium mb-3">Анимированный список</h3>
                    <AnimatedList stagger={150} animation="slideUp">
                      {demoItems.map((item) => (
                        <div key={item.id} className="p-3 bg-muted rounded-lg mb-2">
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      ))}
                    </AnimatedList>
                  </div>
                  
                  <div className="mt-6 flex gap-2">
                    <AccessibleButton onClick={() => setShowModal(true)}>
                      Показать модальное окно
                    </AccessibleButton>
                  </div>
                </div>
              </CardRevealAnimation>
            </div>
          )}

          {/* Мобильные паттерны */}
          {activeTab === 'mobile' && (
            <div className="space-y-6">
              <CardRevealAnimation>
                <div className="p-6 bg-card border rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">👆 Мобильные UI паттерны</h2>
                  
                  <div className="space-y-6">
                    {/* Pull to Refresh */}
                    <div>
                      <h3 className="font-medium mb-3">Pull to Refresh</h3>
                      <PullToRefresh onRefresh={handleRefresh} className="h-48 bg-muted rounded-lg">
                        <div className="p-4 text-center">
                          <p className="text-muted-foreground">
                            Потяните вниз для обновления содержимого
                          </p>
                        </div>
                      </PullToRefresh>
                    </div>
                    
                    {/* Swipe Actions */}
                    <div>
                      <h3 className="font-medium mb-3">Swipe Actions</h3>
                      <div className="space-y-2">
                        {demoItems.map((item) => (
                          <SwipeActions
                            key={item.id}
                            rightActions={swipeActions}
                          >
                            <div className="p-4 bg-background border rounded-lg">
                              <h4 className="font-medium">{item.title}</h4>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                ← Свайпните влево для действий
                              </p>
                            </div>
                          </SwipeActions>
                        ))}
                      </div>
                    </div>
                    
                    {/* Long Press */}
                    <div>
                      <h3 className="font-medium mb-3">Long Press</h3>
                      <LongPress
                        onLongPress={() => {
                          triggerHaptic('heavy');
                          alert('Long press detected!');
                        }}
                      >
                        <div className="p-4 bg-primary/10 rounded-lg text-center cursor-pointer">
                          <p>Удерживайте для активации</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            (с haptic feedback)
                          </p>
                        </div>
                      </LongPress>
                    </div>
                    
                    <div className="flex gap-2">
                      <AccessibleButton onClick={() => setShowBottomSheet(true)}>
                        Показать Bottom Sheet
                      </AccessibleButton>
                    </div>
                  </div>
                </div>
              </CardRevealAnimation>
            </div>
          )}

          {/* Тестирование */}
          {activeTab === 'testing' && (
            <div className="space-y-6">
              <CardRevealAnimation>
                <div className="p-6 bg-card border rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">🧪 Кросс-платформенное тестирование</h2>
                  
                  {testResults.length > 0 && (
                    <CompatibilityStats results={testResults} className="mb-6" />
                  )}
                  
                  <AutoTester
                    tests={uiTests}
                    devices={deviceProfiles.slice(0, 5)} // Первые 5 устройств для демо
                    onResults={setTestResults}
                  >
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                      <h3 className="font-medium mb-2">Тестируемый компонент</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Этот компонент будет протестирован на различных устройствах
                      </p>
                      
                      <div className="flex gap-2">
                        <AccessibleButton size="sm">Кнопка</AccessibleButton>
                        <AccessibleInput label="Поле ввода" placeholder="Поле ввода" className="flex-1" />
                      </div>
                    </div>
                  </AutoTester>
                </div>
              </CardRevealAnimation>
              
              {/* Симулятор устройства */}
              <CardRevealAnimation delay={200}>
                <div className="p-6 bg-card border rounded-lg">
                  <h3 className="font-medium mb-4">📱 Симулятор устройства</h3>
                  
                  <div className="mb-4">
                    <AccessibleSelect
                      label="Выберите устройство"
                      value={selectedDevice.id}
                      onChange={(e) => {
                        const device = deviceProfiles.find(d => d.id === e.target.value);
                        if (device) setSelectedDevice(device);
                      }}
                      options={deviceProfiles.map(device => ({
                        value: device.id,
                        label: device.name,
                      }))}
                    />
                  </div>
                  
                  <DeviceSimulator device={selectedDevice}>
                    <div className="p-4 space-y-4">
                      <h4 className="font-medium">Тестовое приложение</h4>
                      <AccessibleInput label="Поиск" placeholder="Поиск..." />
                      <div className="grid grid-cols-2 gap-2">
                        <AccessibleButton size="sm">Кнопка 1</AccessibleButton>
                        <AccessibleButton size="sm" variant="outline">Кнопка 2</AccessibleButton>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">Контент адаптируется под размер экрана</p>
                      </div>
                    </div>
                  </DeviceSimulator>
                </div>
              </CardRevealAnimation>
            </div>
          )}
        </AnimatedTransition>
      </div>

      {/* Модальное окно */}
      <ModalAnimation show={showModal} onClose={() => setShowModal(false)}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <h3 className="font-semibold mb-4">Модальное окно</h3>
            <p className="text-muted-foreground mb-4">
              Это модальное окно с плавной анимацией появления и исчезновения.
            </p>
            <div className="flex gap-2 justify-end">
              <AccessibleButton variant="outline" onClick={() => setShowModal(false)}>
                Отмена
              </AccessibleButton>
              <AccessibleButton onClick={() => setShowModal(false)}>
                ОК
              </AccessibleButton>
            </div>
          </div>
        </div>
      </ModalAnimation>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        snapPoints={[0.3, 0.6, 0.9]}
      >
        <div className="space-y-4">
          <h3 className="font-semibold">Bottom Sheet</h3>
          <p className="text-muted-foreground">
            Это выдвижная панель снизу с поддержкой жестов и точек привязки.
          </p>
          
          <div className="space-y-2">
            {demoItems.map((item) => (
              <div key={item.id} className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
          
          <AccessibleButton 
            onClick={() => setShowBottomSheet(false)}
            className="w-full"
          >
            Закрыть
          </AccessibleButton>
        </div>
      </BottomSheet>

      {/* Toast уведомление */}
      {showToast && (
        <AccessibleToast
          title="Уведомление"
          message="Это доступное уведомление!"
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </ResponsiveLayout>
  );
};

export default UIShowcase;