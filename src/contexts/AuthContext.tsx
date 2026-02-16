import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import posthog from 'posthog-js';
import { supabase } from '@/integrations/supabase/client';

function clearPersistedAuthTokens() {
  // Supabase v2 stores sessions in localStorage under keys like:
  //   sb-<project-ref>-auth-token
  //   sb-<project-ref>-auth-token-code-verifier
  // In some environments the SDK signOut can fail/skip cleanup, so we force-remove.
  const clearFrom = (storage: Storage) => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      if (key.startsWith('sb-') && key.includes('auth-token')) keysToRemove.push(key);
      if (key === 'supabase.auth.token') keysToRemove.push(key); // legacy
    }
    keysToRemove.forEach((k) => storage.removeItem(k));
  };

  try {
    clearFrom(localStorage);
  } catch {
    // ignore
  }

  try {
    clearFrom(sessionStorage);
  } catch {
    // ignore
  }
}

interface SignInResult {
  error: Error | null;
  migrationRequired?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  authDialogOpen: boolean;
  setAuthDialogOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  useEffect(() => {
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Check if this is a migrated user who needs to set a new password
      const { data: pending } = await supabase
        .from('migration_pending')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (pending) {
        return { error: null, migrationRequired: true };
      }
    }

    if (!error) {
      posthog.identify(email);
      posthog.capture('user_signed_in');
    }
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (!error) {
      posthog.capture('user_signed_up');
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      // Local scope should clear browser storage, but we still defensively purge below.
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore: we still want to clear local state + storage even if the SDK errors.
    } finally {
      posthog.capture('user_signed_out');
      posthog.reset();
      clearPersistedAuthTokens();
      // Force clear state as safety net
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, authDialogOpen, setAuthDialogOpen }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
