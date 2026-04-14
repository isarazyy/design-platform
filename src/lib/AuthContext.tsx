import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from './auth';
import { getCurrentUser, getProfile, onAuthStateChange } from './auth';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User | null) => {
    if (u) {
      const p = await getProfile(u.id);
      setProfile(p);
    } else {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await getProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      setUser(u);
      await loadProfile(u);
      setLoading(false);
    });

    const { data } = onAuthStateChange(async (u) => {
      setUser(u);
      await loadProfile(u);
      setLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
