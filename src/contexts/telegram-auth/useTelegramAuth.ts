import { useContext } from 'react';
import { TelegramAuthContext } from './context';

export const useTelegramAuth = () => useContext(TelegramAuthContext);