import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logError, logInfo } from '@/utils/logger';

interface AuthContextValue {
  user: User | null;
  userId: string | null;
  session: Session | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const defaultValue: AuthContextValue = {
  user: null,
  userId: null,
  session: null,
  isLoading: true,
  refresh: async () => {},
};

export const AuthContext = createContext<AuthContextValue>(defaultValue);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }

      if (!isMountedRef.current) return;

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
    } catch (error) {
      logError('Failed to refresh auth session', error as Error, 'AuthProvider');
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const initialize = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!isSubscribed) return;

        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } catch (error) {
        if (isSubscribed) {
          logError('Failed to initialize auth context', error as Error, 'AuthProvider');
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    const { data: subscriptionData } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isSubscribed) return;
      logInfo('Auth state changed', 'AuthProvider', {
        hasSession: !!nextSession,
        userId: nextSession?.user?.id,
      });
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      isSubscribed = false;
      subscriptionData.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    userId: user?.id ?? null,
    session,
    isLoading,
    refresh,
  }), [user, session, isLoading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
