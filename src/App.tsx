import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { SettingsProvider } from '@/contexts/SettingsContext';

// Основные страницы
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProjectPage } from '@/pages/ProjectPage';
import { SettingsPage } from '@/pages/SettingsPage';

// Новый UI Showcase
import UIShowcase from '@/components/demo/UIShowcase';

// Компоненты загрузки и ошибок
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/ui/error-boundary';

/**
 * 🎵 Главное приложение Albert3 Muse Synth Studio
 */
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showUIShowcase, setShowUIShowcase] = useState(false);

  useEffect(() => {
    // Имитация загрузки приложения
    const initializeApp = async () => {
      try {
        // Здесь может быть инициализация сервисов, проверка аутентификации и т.д.
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Проверяем, нужно ли показать UI Showcase (например, в dev режиме)
        const isDevelopment = process.env.NODE_ENV === 'development';
        const showShowcase = localStorage.getItem('show-ui-showcase') === 'true';
        
        if (isDevelopment || showShowcase) {
          setShowUIShowcase(true);
        }
      } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Показываем загрузку во время инициализации
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Albert3 Muse Synth Studio</h2>
            <p className="text-muted-foreground">Загрузка приложения...</p>
          </div>
        </div>
      </div>
    );
  }

  // Если включён режим демонстрации UI
  if (showUIShowcase) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="albert3-ui-theme">
        <ErrorBoundary>
          <div className="min-h-screen bg-background">
            {/* Переключатель режимов */}
            <div className="fixed top-4 right-4 z-50">
              <button
                onClick={() => setShowUIShowcase(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
              >
                Вернуться к приложению
              </button>
            </div>
            
            <UIShowcase />
          </div>
          <Toaster />
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  // Основное приложение
  return (
    <ThemeProvider defaultTheme="dark" storageKey="albert3-ui-theme">
      <ErrorBoundary>
        <AuthProvider>
          <SettingsProvider>
            <ProjectProvider>
              <Router>
                <div className="min-h-screen bg-background">
                  {/* Переключатель на UI Showcase в dev режиме */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="fixed bottom-4 right-4 z-50">
                      <button
                        onClick={() => setShowUIShowcase(true)}
                        className="px-3 py-2 bg-accent text-accent-foreground rounded-lg shadow-lg hover:bg-accent/90 transition-colors text-sm"
                        title="Показать UI Showcase"
                      >
                        🎨 UI
                      </button>
                    </div>
                  )}

                  <Routes>
                    {/* Главная страница - перенаправление на дашборд */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    
                    {/* Аутентификация */}
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* Основные страницы */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/project/:id" element={<ProjectPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    
                    {/* UI Showcase как отдельная страница */}
                    <Route path="/ui-showcase" element={<UIShowcase />} />
                    
                    {/* 404 страница */}
                    <Route path="*" element={
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
                          <p className="text-muted-foreground">Страница не найдена</p>
                          <button
                            onClick={() => window.history.back()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            Назад
                          </button>
                        </div>
                      </div>
                    } />
                  </Routes>
                </div>
              </Router>
              
              {/* Глобальные компоненты */}
              <Toaster />
            </ProjectProvider>
          </SettingsProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
