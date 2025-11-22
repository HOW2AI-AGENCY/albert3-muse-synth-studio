/**
 * Telegram Web App Authentication Provider
 * Автоматически авторизует пользователей через Telegram если они открыли приложение в TWA
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { 
  isTelegramWebApp, 
  getTelegramInitData, 
  getTelegramUser,
  initTelegramWebApp 
} from '@/utils/telegram/twa';
import { FullPageSpinner } from '@/components/ui/loading-states';
import { logger } from '@/utils/logger';
import { TelegramAuthContext } from './telegram-auth/context';
import type { TelegramAuthResponse } from '@/types/edge-functions';

// Контекст вынесен в ./telegram-auth/context, хук вынесен в ./telegram-auth/useTelegramAuth

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
        // Edge Function authenticate with safety timeout to avoid UI hang
        const AUTH_TIMEOUT_MS = Number(import.meta.env.VITE_TG_AUTH_TIMEOUT_MS ?? 3000);
        const authPromise = SupabaseFunctions.invoke<TelegramAuthResponse>('telegram-auth', {
          body: { initData, user }
        });

        const raced = await Promise.race([
          authPromise,
          new Promise<{ timeout: true }>((resolve) => setTimeout(() => resolve({ timeout: true }), AUTH_TIMEOUT_MS)),
        ]);

        // Timeout: proceed with app without blocking
        if ((raced as any)?.timeout) {
          logger.warn('Telegram auth timed out — continuing without TWA session', 'TelegramAuthProvider');
          setIsInitialized(true);
          return;
        }

        const { data, error } = raced as any;
        if (error) {
          logger.error('Telegram auth failed', error instanceof Error ? error : new Error(String(error)), 'TelegramAuthProvider');
          setIsInitialized(true);
          return;
        }

        if (data?.success && data?.session) {
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
