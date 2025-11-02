/**
 * Telegram Web App SDK wrapper
 * Provides safe access to TWA API with fallbacks
 */

export const isTelegramWebApp = (): boolean => {
  return typeof window !== 'undefined' && 
         window.Telegram?.WebApp !== undefined;
};

export const getTelegramWebApp = () => {
  if (!isTelegramWebApp()) return null;
  return window.Telegram!.WebApp;
};

export const getTelegramInitData = (): string | null => {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  return tg.initData || null;
};

export const getTelegramUser = () => {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  return tg.initDataUnsafe?.user || null;
};

export const getTelegramTheme = () => {
  const tg = getTelegramWebApp();
  if (!tg) {
    return {
      colorScheme: 'light' as const,
      themeParams: {},
      headerColor: '#ffffff',
      backgroundColor: '#ffffff',
    };
  }
  
  return {
    colorScheme: tg.colorScheme || 'light',
    themeParams: tg.themeParams || {},
    headerColor: tg.themeParams?.header_bg_color || tg.headerColor || '#ffffff',
    backgroundColor: tg.themeParams?.bg_color || tg.backgroundColor || '#ffffff',
  };
};

export const initTelegramWebApp = () => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
  
  // Set theme colors
  const theme = getTelegramTheme();
  tg.setHeaderColor(theme.headerColor);
  tg.setBackgroundColor(theme.backgroundColor);
};

export const closeTelegramWebApp = () => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  
  tg.disableClosingConfirmation();
  tg.close();
};

export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type HapticNotificationType = 'error' | 'success' | 'warning';

export const sendHapticFeedback = (
  type: HapticImpactStyle | HapticNotificationType
) => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  
  if (type === 'success' || type === 'warning' || type === 'error') {
    tg.HapticFeedback.notificationOccurred(type);
  } else {
    tg.HapticFeedback.impactOccurred(type);
  }
};

export const showMainButton = (
  text: string,
  onClick: () => void,
  options?: {
    color?: string;
    textColor?: string;
    isActive?: boolean;
  }
) => {
  const tg = getTelegramWebApp();
  if (!tg) return () => {};
  
  const btn = tg.MainButton;
  
  btn.setText(text);
  btn.setParams({
    color: options?.color || tg.themeParams.button_color,
    text_color: options?.textColor || tg.themeParams.button_text_color,
    is_active: options?.isActive !== false,
    is_visible: true,
  });
  
  btn.onClick(onClick);
  btn.show();
  
  // Return cleanup function
  return () => {
    btn.offClick(onClick);
    btn.hide();
  };
};

export const hideMainButton = () => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.MainButton.hide();
};

export const showBackButton = (onClick: () => void) => {
  const tg = getTelegramWebApp();
  if (!tg) return () => {};
  
  const btn = tg.BackButton;
  btn.onClick(onClick);
  btn.show();
  
  // Return cleanup function
  return () => {
    btn.offClick(onClick);
    btn.hide();
  };
};

export const hideBackButton = () => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.BackButton.hide();
};

export const openTelegramLink = (url: string) => {
  const tg = getTelegramWebApp();
  if (!tg) {
    window.open(url, '_blank');
    return;
  }
  tg.openTelegramLink(url);
};

export const shareToTelegram = (url: string, text: string) => {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  openTelegramLink(shareUrl);
};

export const getTelegramStartParam = (): string | null => {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  return tg.initDataUnsafe?.start_param || null;
};

// Cloud Storage helpers
export const setCloudStorageItem = (key: string, value: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const tg = getTelegramWebApp();
    if (!tg) {
      // Fallback to localStorage
      try {
        localStorage.setItem(key, value);
        resolve(true);
      } catch (error) {
        reject(error);
      }
      return;
    }
    
    tg.CloudStorage.setItem(key, value, (error, result) => {
      if (error) reject(error);
      else resolve(result || false);
    });
  });
};

export const getCloudStorageItem = (key: string): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const tg = getTelegramWebApp();
    if (!tg) {
      // Fallback to localStorage
      try {
        const value = localStorage.getItem(key);
        resolve(value);
      } catch (error) {
        reject(error);
      }
      return;
    }
    
    tg.CloudStorage.getItem(key, (error, value) => {
      if (error) reject(error);
      else resolve(value || null);
    });
  });
};

export const removeCloudStorageItem = (key: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const tg = getTelegramWebApp();
    if (!tg) {
      // Fallback to localStorage
      try {
        localStorage.removeItem(key);
        resolve(true);
      } catch (error) {
        reject(error);
      }
      return;
    }
    
    tg.CloudStorage.removeItem(key, (error, result) => {
      if (error) reject(error);
      else resolve(result || false);
    });
  });
};
