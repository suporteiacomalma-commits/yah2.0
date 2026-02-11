import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Debug log for mobile
    const log = (msg: string) => {
      console.log(msg);
      // if ((window as any).__debugLog) (window as any).__debugLog(msg);
    };

    log("AuthProvider mounting...");

    // Timeout fail-safe: if Supabase takes too long, stop loading
    const timeoutTimer = setTimeout(() => {
      if (loading) {
        log("Auth timeout reached (5s). Forcing loading=false.");
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        log(`Auth event: ${event}`);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(timeoutTimer);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) log(`getSession error: ${error.message}`);
      else log(`getSession success: ${session ? 'User found' : 'No user'}`);

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      clearTimeout(timeoutTimer);
    }).catch(err => {
      log(`getSession exception: ${err}`);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutTimer);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      console.log("Starting sign out process...");
      await supabase.auth.signOut();
      // Explicitly clear state to ensure UI updates even if onAuthStateChange is delayed
      setSession(null);
      setUser(null);
      console.log("Sign out successful");
    } catch (error) {
      console.error("Error during sign out:", error);
      // Fallback: still clear state even if Supabase sign out fails
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
