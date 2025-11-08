import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 🔍 Типы устройств и их характеристики
 */
interface DeviceProfile {
  id: string;
  name: string;
  category: 'mobile' | 'tablet' | 'desktop' | 'tv';
  platform: 'ios' | 'android' | 'web' | 'smart-tv';
  viewport: {
    width: number;
    height: number;
  };
  pixelRatio: number;
  userAgent: string;
  features: {
    touch: boolean;
    hover: boolean;
    orientation: boolean;
    haptics: boolean;
    safeArea: boolean;
  };
  browser?: {
    name: string;
    version: string;
    engine: string;
  };
}

/**
 * 📱 Предустановленные профили устройств
 */
const deviceProfiles: DeviceProfile[] = [
  // iOS устройства
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    category: 'mobile',
    platform: 'ios',
    viewport: { width: 393, height: 852 },
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    features: {
      touch: true,
      hover: false,
      orientation: true,
      haptics: true,
      safeArea: true,
    },
    browser: {
      name: 'Safari',
      version: '17.0',
      engine: 'WebKit',
    },
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE (3rd gen)',
    category: 'mobile',
    platform: 'ios',
    viewport: { width: 375, height: 667 },
    pixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    features: {
      touch: true,
      hover: false,
      orientation: true,
      haptics: true,
      safeArea: false,
    },
    browser: {
      name: 'Safari',
      version: '17.0',
      engine: 'WebKit',
    },
  },
  {
    id: 'ipad-pro',
    name: 'iPad Pro 12.9"',
    category: 'tablet',
    platform: 'ios',
    viewport: { width: 1024, height: 1366 },
    pixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    features: {
      touch: true,
      hover: true,
      orientation: true,
      haptics: false,
      safeArea: false,
    },
    browser: {
      name: 'Safari',
      version: '17.0',
      engine: 'WebKit',
    },
  },
  // Android устройства
  {
    id: 'pixel-8-pro',
    name: 'Google Pixel 8 Pro',
    category: 'mobile',
    platform: 'android',
    viewport: { width: 412, height: 915 },
    pixelRatio: 2.625,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    features: {
      touch: true,
      hover: false,
      orientation: true,
      haptics: true,
      safeArea: false,
    },
    browser: {
      name: 'Chrome',
      version: '119.0',
      engine: 'Blink',
    },
  },
  {
    id: 'samsung-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    category: 'mobile',
    platform: 'android',
    viewport: { width: 412, height: 915 },
    pixelRatio: 3.5,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    features: {
      touch: true,
      hover: false,
      orientation: true,
      haptics: true,
      safeArea: false,
    },
    browser: {
      name: 'Samsung Internet',
      version: '23.0',
      engine: 'Blink',
    },
  },
  // Desktop браузеры
  {
    id: 'chrome-desktop',
    name: 'Chrome Desktop',
    category: 'desktop',
    platform: 'web',
    viewport: { width: 1920, height: 1080 },
    pixelRatio: 1,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    features: {
      touch: false,
      hover: true,
      orientation: false,
      haptics: false,
      safeArea: false,
    },
    browser: {
      name: 'Chrome',
      version: '119.0',
      engine: 'Blink',
    },
  },
  {
    id: 'safari-desktop',
    name: 'Safari Desktop',
    category: 'desktop',
    platform: 'web',
    viewport: { width: 1440, height: 900 },
    pixelRatio: 2,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    features: {
      touch: false,
      hover: true,
      orientation: false,
      haptics: false,
      safeArea: false,
    },
    browser: {
      name: 'Safari',
      version: '17.0',
      engine: 'WebKit',
    },
  },
  {
    id: 'firefox-desktop',
    name: 'Firefox Desktop',
    category: 'desktop',
    platform: 'web',
    viewport: { width: 1920, height: 1080 },
    pixelRatio: 1,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
    features: {
      touch: false,
      hover: true,
      orientation: false,
      haptics: false,
      safeArea: false,
    },
    browser: {
      name: 'Firefox',
      version: '119.0',
      engine: 'Gecko',
    },
  },
];

/**
 * 🧪 Результаты тестирования
 */
interface TestResult {
  deviceId: string;
  testName: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  timestamp: Date;
  screenshot?: string;
  metrics?: {
    loadTime: number;
    renderTime: number;
    interactionTime: number;
    memoryUsage: number;
  };
}

/**
 * 🔧 Хук для определения текущего устройства
 */
const useDeviceDetection = () => {
  const [currentDevice, setCurrentDevice] = useState<DeviceProfile | null>(null);
  const [capabilities, setCapabilities] = useState({
    touch: false,
    hover: false,
    orientation: false,
    haptics: false,
    webGL: false,
    serviceWorker: false,
    webAssembly: false,
  });

  useEffect(() => {
    // Определяем характеристики устройства
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      const userAgent = navigator.userAgent;

      // Определяем возможности
      const newCapabilities = {
        touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        hover: window.matchMedia('(hover: hover)').matches,
        orientation: 'orientation' in window,
        haptics: 'vibrate' in navigator,
        webGL: !!document.createElement('canvas').getContext('webgl'),
        serviceWorker: 'serviceWorker' in navigator,
        webAssembly: 'WebAssembly' in window,
      };

      setCapabilities(newCapabilities);

      // Пытаемся найти подходящий профиль устройства
      const matchingProfile = deviceProfiles.find(profile => {
        const widthMatch = Math.abs(profile.viewport.width - width) < 50;
        const heightMatch = Math.abs(profile.viewport.height - height) < 50;
        const ratioMatch = Math.abs(profile.pixelRatio - pixelRatio) < 0.5;
        
        return widthMatch && heightMatch && ratioMatch;
      });

      if (matchingProfile) {
        setCurrentDevice(matchingProfile);
      } else {
        // Создаем профиль для неизвестного устройства
        const category = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
        const platform = /iPhone|iPad|iPod/.test(userAgent) ? 'ios' :
                         /Android/.test(userAgent) ? 'android' : 'web';

        setCurrentDevice({
          id: 'unknown-device',
          name: 'Unknown Device',
          category,
          platform,
          viewport: { width, height },
          pixelRatio,
          userAgent,
          features: {
            touch: newCapabilities.touch,
            hover: newCapabilities.hover,
            orientation: newCapabilities.orientation,
            haptics: newCapabilities.haptics,
            safeArea: false,
          },
        });
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return { currentDevice, capabilities };
};

/**
 * 📊 Компонент для отображения информации об устройстве
 */
interface DeviceInfoProps {
  device?: DeviceProfile | null;
  className?: string;
}

export const DeviceInfo: React.FC<DeviceInfoProps> = ({ device, className }) => {
  const { currentDevice, capabilities } = useDeviceDetection();
  const displayDevice = device || currentDevice;

  if (!displayDevice) {
    return (
      <div className={cn('p-4 bg-muted rounded-lg', className)}>
        <p className="text-sm text-muted-foreground">Определение устройства...</p>
      </div>
    );
  }

  return (
    <div className={cn('p-4 bg-background border rounded-lg space-y-3', className)}>
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-3 h-3 rounded-full',
          displayDevice.category === 'mobile' ? 'bg-blue-500' :
          displayDevice.category === 'tablet' ? 'bg-green-500' :
          displayDevice.category === 'desktop' ? 'bg-purple-500' : 'bg-gray-500'
        )} />
        <h3 className="font-semibold">{displayDevice.name}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Разрешение</p>
          <p className="font-mono">
            {displayDevice.viewport.width} × {displayDevice.viewport.height}
          </p>
        </div>
        
        <div>
          <p className="text-muted-foreground">Pixel Ratio</p>
          <p className="font-mono">{displayDevice.pixelRatio}x</p>
        </div>
        
        <div>
          <p className="text-muted-foreground">Платформа</p>
          <p className="capitalize">{displayDevice.platform}</p>
        </div>
        
        <div>
          <p className="text-muted-foreground">Категория</p>
          <p className="capitalize">{displayDevice.category}</p>
        </div>
      </div>

      {displayDevice.browser && (
        <div>
          <p className="text-muted-foreground text-sm">Браузер</p>
          <p className="font-mono text-sm">
            {displayDevice.browser.name} {displayDevice.browser.version} ({displayDevice.browser.engine})
          </p>
        </div>
      )}

      <div>
        <p className="text-muted-foreground text-sm mb-2">Возможности</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(capabilities).map(([key, supported]) => (
            <span
              key={key}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                supported 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              )}
            >
              {key}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 🧪 Компонент для автоматического тестирования
 */
interface AutoTesterProps {
  children: ReactNode;
  tests: Array<{
    name: string;
    test: (device: DeviceProfile) => Promise<TestResult>;
  }>;
  devices?: DeviceProfile[];
  onResults?: (results: TestResult[]) => void;
  className?: string;
}

export const AutoTester: React.FC<AutoTesterProps> = ({
  children,
  tests,
  devices = deviceProfiles,
  onResults,
  className,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    const allResults: TestResult[] = [];

    for (const device of devices) {
      for (const test of tests) {
        setCurrentTest(`${device.name}: ${test.name}`);
        
        try {
          const result = await test.test(device);
          allResults.push(result);
          setResults([...allResults]);
        } catch (error) {
          const errorResult: TestResult = {
            deviceId: device.id,
            testName: test.name,
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          };
          allResults.push(errorResult);
          setResults([...allResults]);
        }
      }
    }

    setIsRunning(false);
    setCurrentTest('');
    onResults?.(allResults);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return 'text-green-600 dark:text-green-400';
      case 'fail': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'pending': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Контролы тестирования */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div>
          <h3 className="font-semibold">Кросс-платформенное тестирование</h3>
          <p className="text-sm text-muted-foreground">
            {devices.length} устройств × {tests.length} тестов = {devices.length * tests.length} проверок
          </p>
        </div>
        
        <button
          onClick={runTests}
          disabled={isRunning}
          className={cn(
            'px-4 py-2 rounded-md font-medium transition-colors',
            isRunning
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {isRunning ? 'Тестирование...' : 'Запустить тесты'}
        </button>
      </div>

      {/* Текущий тест */}
      {isRunning && currentTest && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Выполняется: {currentTest}
          </p>
        </div>
      )}

      {/* Результаты тестирования */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Результаты тестирования</h4>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-background border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getStatusIcon(result.status)}</span>
                  <div>
                    <p className="font-medium">
                      {devices.find(d => d.id === result.deviceId)?.name} - {result.testName}
                    </p>
                    <p className={cn('text-sm', getStatusColor(result.status))}>
                      {result.message}
                    </p>
                  </div>
                </div>
                
                {result.metrics && (
                  <div className="text-xs text-muted-foreground text-right">
                    <p>Загрузка: {result.metrics.loadTime}ms</p>
                    <p>Рендер: {result.metrics.renderTime}ms</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Тестируемый контент */}
      <div className="border rounded-lg p-4">
        {children}
      </div>
    </div>
  );
};

/**
 * 📱 Симулятор устройства
 */
interface DeviceSimulatorProps {
  device: DeviceProfile;
  children: ReactNode;
  className?: string;
}

export const DeviceSimulator: React.FC<DeviceSimulatorProps> = ({
  device,
  children,
  className,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!frameRef.current) return;
      
      const container = frameRef.current.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth - 40; // padding
      const containerHeight = container.clientHeight - 40;
      
      const scaleX = containerWidth / device.viewport.width;
      const scaleY = containerHeight / device.viewport.height;
      
      setScale(Math.min(scaleX, scaleY, 1));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => window.removeEventListener('resize', updateScale);
  }, [device.viewport]);

  return (
    <div className={cn('flex flex-col items-center p-4', className)}>
      {/* Информация об устройстве */}
      <div className="mb-4 text-center">
        <h3 className="font-semibold">{device.name}</h3>
        <p className="text-sm text-muted-foreground">
          {device.viewport.width} × {device.viewport.height} ({device.pixelRatio}x)
        </p>
      </div>

      {/* Рамка устройства */}
      <div
        ref={frameRef}
        className={cn(
          'relative bg-background border-8 rounded-3xl shadow-2xl overflow-hidden',
          device.category === 'mobile' ? 'border-gray-800' :
          device.category === 'tablet' ? 'border-gray-600' :
          'border-gray-400'
        )}
        style={{
          width: device.viewport.width,
          height: device.viewport.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Safe area для iOS */}
        {device.features.safeArea && (
          <>
            <div className="absolute top-0 left-0 right-0 h-11 bg-black rounded-t-2xl" />
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-black rounded-b-2xl" />
          </>
        )}

        {/* Контент */}
        <div 
          className="w-full h-full overflow-auto"
          style={{
            paddingTop: device.features.safeArea ? '44px' : '0',
            paddingBottom: device.features.safeArea ? '32px' : '0',
          }}
        >
          {children}
        </div>
      </div>

      {/* Масштаб */}
      <p className="mt-2 text-xs text-muted-foreground">
        Масштаб: {Math.round(scale * 100)}%
      </p>
    </div>
  );
};

/**
 * 📊 Статистика совместимости
 */
interface CompatibilityStatsProps {
  results: TestResult[];
  className?: string;
}

export const CompatibilityStats: React.FC<CompatibilityStatsProps> = ({
  results,
  className,
}) => {
  const stats = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = results.length;
  const passRate = total > 0 ? Math.round((stats.pass || 0) / total * 100) : 0;

  return (
    <div className={cn('p-4 bg-muted rounded-lg', className)}>
      <h4 className="font-semibold mb-3">Статистика совместимости</h4>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.pass || 0}
          </div>
          <div className="text-sm text-muted-foreground">Успешно</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {stats.fail || 0}
          </div>
          <div className="text-sm text-muted-foreground">Ошибки</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.warning || 0}
          </div>
          <div className="text-sm text-muted-foreground">Предупреждения</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {passRate}%
          </div>
          <div className="text-sm text-muted-foreground">Совместимость</div>
        </div>
      </div>

      {/* Прогресс-бар */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${passRate}%` }}
        />
      </div>
    </div>
  );
};