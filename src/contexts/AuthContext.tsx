import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile } from '@/types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type AuthApiResponse = {
  access_token?: string;
  refresh_token?: string;
  msg?: string;
  message?: string;
  error_description?: string;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, schoolName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const getMetadataRole = (authUser: User | null): AppRole | null => {
    const metadataRole = authUser?.user_metadata?.role;
    return metadataRole === 'admin' || metadataRole === 'teacher' || metadataRole === 'student'
      ? metadataRole
      : null;
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (error && typeof error === 'object') {
      const candidate = error as Record<string, unknown>;
      const message = candidate.msg ?? candidate.message ?? candidate.error_description;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }

    return fallback;
  };

  const isNetworkError = (error: unknown) => {
    const message = getErrorMessage(error, '');
    return /failed to fetch|network/i.test(message);
  };

  const performDirectAuthRequest = async <T extends AuthApiResponse>(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<{ data: T | null; error: Error | null }> => {
    try {
      const response = await fetch(`${SUPABASE_URL}${path}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'omit',
      });

      const data = (await response.json().catch(() => null)) as T | null;

      if (!response.ok) {
        return {
          data: null,
          error: new Error(getErrorMessage(data, 'Authentication request failed.')),
        };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: new Error(getErrorMessage(error, 'Authentication request failed.')),
      };
    }
  };

  const signInWithDirectRequest = async (email: string, password: string) => {
    const { data, error } = await performDirectAuthRequest<AuthApiResponse>('/auth/v1/token?grant_type=password', {
      email,
      password,
    });

    if (error) {
      return { error };
    }

    if (!data?.access_token || !data?.refresh_token) {
      return { error: new Error('Unable to start your session. Please try again.') };
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    return {
      error: sessionError ? new Error(sessionError.message) : null,
    };
  };

  const signUpWithDirectRequest = async (email: string, password: string, fullName: string, signupRole: AppRole) => {
    const redirectUrl = window.location.origin;
    return performDirectAuthRequest<AuthApiResponse>(
      `/auth/v1/signup?redirect_to=${encodeURIComponent(redirectUrl)}`,
      {
        email,
        password,
        data: {
          full_name: fullName.trim(),
          role: signupRole,
        },
      },
    );
  };

  const fetchUserData = async (authUser: User) => {
    try {
      const userId = authUser.id;

      // Fetch profile
      let [{ data: profileData }, { data: roleData }, { data: rpcRole }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.rpc('get_user_role', { _user_id: userId }),
      ]);

      // Self-healing: if the account has no record yet, or no school linked to it,
      // create/repair it so class, teacher and student creation cannot fail with
      // "no school is assigned to your account".
      if (!profileData || !(profileData as Profile).school_id) {
        const { error: ensureError } = await supabase.rpc('ensure_my_account' as any);
        if (ensureError) {
          console.error('Account setup failed:', ensureError.message);
        } else {
          const [{ data: healedProfile }, { data: healedRole }] = await Promise.all([
            supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
          ]);
          if (healedProfile) profileData = healedProfile as any;
          if (healedRole) roleData = healedRole as any;
        }
      }

      setProfile(profileData ? (profileData as Profile) : null);

      const resolvedRole = (roleData?.role as AppRole | null | undefined) ??
        (rpcRole as AppRole | null | undefined) ??
        getMetadataRole(authUser);

      setRole(resolvedRole ?? null);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setProfile(null);
      setRole(getMetadataRole(authUser));
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  useEffect(() => {
    let mounted = true;
    let lastUserId: string | null = null;

    const resolveSession = async (currentSession: Session | null, isInitial: boolean) => {
      if (!mounted) return;
      const nextUserId = currentSession?.user?.id ?? null;
      const userChanged = nextUserId !== lastUserId;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Only refetch profile/role when the user actually changes (sign-in / sign-out / account switch).
        // Token refresh on tab focus must NOT clear role, or ProtectedRoute redirects to /auth/login.
        if (userChanged || isInitial) {
          setRole(null);
          await fetchUserData(currentSession.user);
        }
      } else {
        setProfile(null);
        setRole(null);
      }

      lastUserId = nextUserId;
      if (mounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => { void resolveSession(currentSession, false); }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void resolveSession(currentSession, true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        
        if (error) {
          if (isNetworkError(error)) {
            const fallbackResult = await signInWithDirectRequest(normalizedEmail, password);

            if (!fallbackResult.error) {
              return fallbackResult;
            }

            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }

            return fallbackResult;
          }

          return { error };
        }
        
        return { error: null };
      } catch (error) {
        if (isNetworkError(error)) {
          const fallbackResult = await signInWithDirectRequest(normalizedEmail, password);

          if (!fallbackResult.error) {
            return fallbackResult;
          }

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }

          return fallbackResult;
        }

        return { error: error as Error };
      }
    }
    return { error: new Error('Failed to sign in after multiple attempts.') };
  };

  const signUp = async (email: string, password: string, fullName: string, schoolName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName.trim(),
            role: 'admin',
            school_name: schoolName.trim(),
          },
        },
      });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
