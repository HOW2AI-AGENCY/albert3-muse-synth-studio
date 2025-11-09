import { createContext } from 'react';
import { getTelegramUser } from '@/utils/telegram/twa';

export interface TelegramAuthContextValue {
  isTelegramAuth: boolean;
  isInitialized: boolean;
  telegramUser: ReturnType<typeof getTelegramUser> | null;
}

export const TelegramAuthContext = createContext<TelegramAuthContextValue>({
  isTelegramAuth: false,
  isInitialized: false,
  telegramUser: null,
});