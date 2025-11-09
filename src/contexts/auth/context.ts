import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthContextValue {
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