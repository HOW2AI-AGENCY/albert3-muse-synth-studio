// src/contexts/MockAuthContext.tsx
import { useMemo, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue } from './auth/context';

interface MockAuthProviderProps {
  children: React.ReactNode;
}

/**
 * Мок-провайдер аутентификации для использования в E2E-тестах.
 * Позволяет управлять состоянием пользователя через глобальные функции.
 */
export const MockAuthProvider: React.FC<MockAuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mockLogin = useCallback((mockUser: User, mockSession?: Partial<Session>) => {
    const defaultSession: Session = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
      ...mockSession,
    };
    setUser(mockUser);
    setSession(defaultSession);
  }, []);

  const mockLogout = useCallback(() => {
    setUser(null);
    setSession(null);
  }, []);

  // Привязываем функции к window, чтобы Playwright мог их вызывать
  if (typeof window !== 'undefined') {
    (window as any).__MOCK_AUTH = {
      login: mockLogin,
      logout: mockLogout,
    };
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    userId: user?.id ?? null,
    session,
    isLoading,
    refresh: async () => {}, // В моке рефреш ничего не делает
  }), [user, session, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
