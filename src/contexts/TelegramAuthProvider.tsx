/**
 * Telegram Web App Authentication Provider
 * Автоматически авторизует пользователей через Telegram если они открыли приложение в TWA
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  isTelegramWebApp, 
  getTelegramInitData, 
  getTelegramUser,
  initTelegramWebApp 
} from '@/utils/telegram/twa';
import { FullPageSpinner } from '@/components/ui/loading-states';
import { logger } from '@/utils/logger';

interface TelegramAuthContextValue {
  isTelegramAuth: boolean;
  isInitialized: boolean;
  telegramUser: ReturnType<typeof getTelegramUser> | null;
}

const TelegramAuthContext = createContext<TelegramAuthContextValue>({
  isTelegramAuth: false,
  isInitialized: false,
  telegramUser: null,
});

export const useTelegramAuth = () => useContext(TelegramAuthContext);

interface TelegramAuthProviderProps {
  children: React.ReactNode;
}

export const TelegramAuthProvider: React.FC<TelegramAuthProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTelegramAuth, setIsTelegramAuth] = useState(false);
  const [telegramUser, setTelegramUser] = useState<ReturnType<typeof getTelegramUser> | null>(null);

  useEffect(() => {
    const initTelegram = async () => {
      // Check if running in Telegram Web App
      if (!isTelegramWebApp()) {
        logger.info('Not a Telegram Web App, using standard auth', 'TelegramAuthProvider');
        setIsInitialized(true);
        return;
      }

      try {
        logger.info('Telegram Web App detected, initializing...', 'TelegramAuthProvider');
        
        // Initialize TWA SDK
        initTelegramWebApp();

        const initData = getTelegramInitData();
        const user = getTelegramUser();

        if (!initData || !user) {
          logger.warn('Missing Telegram initData or user', 'TelegramAuthProvider');
          setIsInitialized(true);
          return;
        }

        logger.info(`Authenticating Telegram user: ${user.id} (${user.first_name})`, 'TelegramAuthProvider');
        setTelegramUser(user);

        // Call Edge Function to verify and authenticate
        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: { initData, user }
        });

        if (error) {
          logger.error('Telegram auth failed', error instanceof Error ? error : new Error(String(error)), 'TelegramAuthProvider');
          setIsInitialized(true);
          return;
        }

        if (data?.success && data?.session) {
          // Set Supabase session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) {
            logger.error('Failed to set session', sessionError instanceof Error ? sessionError : new Error(String(sessionError)), 'TelegramAuthProvider');
          } else {
            logger.info('✅ Telegram authentication successful', 'TelegramAuthProvider');
            setIsTelegramAuth(true);
          }
        }
      } catch (error) {
        logger.error('Telegram auth initialization failed', error instanceof Error ? error : new Error(String(error)), 'TelegramAuthProvider');
      } finally {
        setIsInitialized(true);
      }
    };

    initTelegram();
  }, []);

  if (!isInitialized) {
    return <FullPageSpinner text="Подключение к Telegram..." />;
  }

  return (
    <TelegramAuthContext.Provider value={{ isTelegramAuth, isInitialized, telegramUser }}>
      {children}
    </TelegramAuthContext.Provider>
  );
};
