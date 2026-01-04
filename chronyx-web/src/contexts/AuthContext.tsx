import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";



interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOnlineAuth: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}
const isSupabaseAvailable =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const AuthContext = createContext<AuthContextType>(null as never);


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!supabase) {
    // Offline / Desktop / Local mode
    setUser(null);
    setSession(null);
    setLoading(false);
    return;
  }

  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    setUser(data.session?.user ?? null);
    setLoading(false);
  });

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    }
  );

  return () => {
    listener?.subscription.unsubscribe();
  };
}, []);


  const signUp = async (email: string, password: string) => {
    if (!supabase) {
    return { error: new Error("Offline mode: sign-in disabled") };
  }
    const redirectUrl = `${window.location.origin}/app`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    
    // Send welcome email if signup was successful
    if (!error && data?.user) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, name: email.split('@')[0] }
        });
      } catch (e) {
        console.error('Failed to send welcome email:', e);
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
    return { error: new Error("Offline mode: sign-in disabled") };
  }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
    return { error: new Error("Offline mode: sign-in disabled") };
  }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });
    return { error };
  };

  const signOut = async () => {
      if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider 
    value={{ 
      user, 
      session, 
      loading,
      isOnlineAuth: isSupabaseAvailable, 
      signUp, 
      signIn, 
      signInWithGoogle, 
      signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
