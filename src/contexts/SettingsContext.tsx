import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: 'ru' | 'en';
  autoSave: boolean;
  notifications: boolean;
  audioQuality: 'low' | 'medium' | 'high';
  defaultProvider: 'replicate' | 'suno';
  maxConcurrentGenerations: number;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
  loading: boolean;
}

const defaultSettings: Settings = {
  theme: 'system',
  language: 'ru',
  autoSave: true,
  notifications: true,
  audioQuality: 'high',
  defaultProvider: 'suno',
  maxConcurrentGenerations: 3,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Загружаем настройки из localStorage при инициализации
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Сохраняем настройки в localStorage при изменении
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('app-settings', JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }
  }, [settings, loading]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('app-settings');
  };

  const value = {
    settings,
    updateSettings,
    resetSettings,
    loading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}