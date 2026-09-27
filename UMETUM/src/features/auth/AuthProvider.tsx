import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isBackendConfigured } from '@/lib/env';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, user: null, isLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(isBackendConfigured);

  useEffect(() => {
    if (!isBackendConfigured) return;

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, isLoading }),
    [session, isLoading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** Identifiant de l'utilisateur connecté (écrans protégés uniquement). */
export function useUserId(): string {
  const { user } = useAuth();
  return user?.id ?? '';
}
