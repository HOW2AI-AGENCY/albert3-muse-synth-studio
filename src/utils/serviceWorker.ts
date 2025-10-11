// Утилиты для работы с Service Worker
import { logInfo, logError } from '@/utils/logger';

export interface CacheInfo {
  fileCount: number;
  maxFiles: number;
  maxSize: number;
  files: string[];
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
  }

  /**
   * Регистрация Service Worker
   */
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[SW Manager] Service Worker не поддерживается');
      return false;
    }

    try {
      logInfo('Регистрация Service Worker', 'SW Manager');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      logInfo('Service Worker зарегистрирован', 'SW Manager', { scope: this.registration.scope });

      // Обработка обновлений
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logInfo('Доступно обновление Service Worker', 'SW Manager');
              this.notifyUpdate();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('[SW Manager] Ошибка регистрации Service Worker:', error);
      return false;
    }
  }

  /**
   * Отмена регистрации Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      logInfo('Service Worker отменен', 'SW Manager', { result });
      this.registration = null;
      return result;
    } catch (error) {
      console.error('[SW Manager] Ошибка отмены регистрации:', error);
      return false;
    }
  }

  /**
   * Принудительное кэширование аудио файла
   */
  async cacheAudioFile(url: string): Promise<void> {
    if (!this.isActive()) {
      console.warn('[SW Manager] Service Worker не активен');
      return;
    }

    try {
      navigator.serviceWorker.controller?.postMessage({
        type: 'CACHE_AUDIO',
        data: { url }
      });
      logInfo('Запрос на кэширование отправлен', 'SW Manager', { url });
    } catch (error) {
      logError('Ошибка отправки запроса на кэширование', error as Error, 'SW Manager');
    }
  }

  /**
   * Очистка кэша аудио файлов
   */
  async clearAudioCache(): Promise<void> {
    if (!this.isActive()) {
      console.warn('[SW Manager] Service Worker не активен');
      return;
    }

    try {
      navigator.serviceWorker.controller?.postMessage({
        type: 'CLEAR_CACHE'
      });
      logInfo('Запрос на очистку кэша отправлен', 'SW Manager');
    } catch (error) {
      logError('Ошибка очистки кэша', error as Error, 'SW Manager');
    }
  }

  /**
   * Получение информации о кэше
   */
  async getCacheInfo(): Promise<CacheInfo | null> {
    if (!this.isActive()) {
      console.warn('[SW Manager] Service Worker не активен');
      return null;
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      try {
        navigator.serviceWorker.controller?.postMessage(
          { type: 'GET_CACHE_INFO' },
          [messageChannel.port2]
        );
      } catch (error) {
        console.error('[SW Manager] Ошибка получения информации о кэше:', error);
        reject(error);
      }
    });
  }

  /**
   * Проверка активности Service Worker
   */
  private isActive(): boolean {
    return this.isSupported && 
           navigator.serviceWorker.controller !== null;
  }

  /**
   * Уведомление об обновлении
   */
  private notifyUpdate(): void {
    logInfo('Service Worker обновлен', 'SW Manager');
    
    // Отправляем событие для компонентов
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  /**
   * Получение статуса Service Worker
   */
  getStatus(): {
    supported: boolean;
    registered: boolean;
    active: boolean;
  } {
    return {
      supported: this.isSupported,
      registered: this.registration !== null,
      active: this.isActive()
    };
  }
}

// Создаем единственный экземпляр менеджера
export const serviceWorkerManager = new ServiceWorkerManager();

/**
 * Экспорт функции для кэширования аудио файлов
 */
export const cacheAudioFile = async (url: string): Promise<void> => {
  return serviceWorkerManager.cacheAudioFile(url);
};

/**
 * Экспорт функции для очистки кэша
 */
export const clearAudioCache = async (): Promise<void> => {
  return serviceWorkerManager.clearAudioCache();
};

/**
 * Экспорт функции для получения информации о кэше
 */
export const getCacheInfo = async (): Promise<CacheInfo | null> => {
  return serviceWorkerManager.getCacheInfo();
};

/**
 * Хук для автоматической регистрации Service Worker при загрузке приложения
 */
export const initServiceWorker = async (): Promise<void> => {
  // Регистрируем только в production
  if (import.meta.env.PROD) {
    const registered = await serviceWorkerManager.register();
    if (registered) {
      logInfo('Service Worker успешно инициализирован', 'SW Manager');
    }
  } else {
    logInfo('Service Worker отключен в режиме разработки', 'SW Manager');
  }
};

/**
 * Утилита для предварительного кэширования аудио файлов
 */
export const preloadAudioFiles = async (urls: string[]): Promise<void> => {
  if (!serviceWorkerManager.getStatus().active) {
    console.warn('[SW Manager] Service Worker не активен, предзагрузка невозможна');
    return;
  }

  logInfo('Предзагрузка аудио файлов', 'SW Manager', { count: urls.length });
  
  for (const url of urls) {
    await serviceWorkerManager.cacheAudioFile(url);
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

/**
 * Утилита для получения размера кэша в человекочитаемом формате
 */
export const formatCacheSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Проверка доступности файла в кэше
 */
export const isFileCached = async (url: string): Promise<boolean> => {
  try {
    const cacheInfo = await serviceWorkerManager.getCacheInfo();
    return cacheInfo?.files.includes(url) || false;
  } catch (error) {
    console.error('[SW Manager] Ошибка проверки кэша:', error);
    return false;
  }
};