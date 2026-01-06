import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { saveAuthToken, clearAuthToken } from "@/lib/authStore";

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
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      } else {
        setSession(null);
        setUser(null);
      }

      setLoading(false);
    };

    load();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => listener?.subscription.unsubscribe();
  }, []);

  // derived values
  const isAuthenticated = !!user;
  const isLoadingAuth = loading;

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: new Error("Offline mode: sign-in disabled") };

    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });

    if (!error && data.session?.access_token) {
      await saveAuthToken(data.session.access_token);
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error("Offline mode: sign-in disabled") };

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data?.session?.access_token) {
      await saveAuthToken(data.session.access_token);

      // 👇 send welcome email (first login) -> Ignore and now we are using from Supabase DB trigger
    // await sendWelcomeEmail(
    //   data.session.user.email!,
    //   data.session.user.user_metadata?.full_name
    // );
    }

    return { error };
  };

  const signInWithGoogle = async () => {
  if (!supabase) return { error: new Error("Offline mode: sign-in disabled") };

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback`  },
  });

  return { error };
};
  const signOut = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    await clearAuthToken();
  };

//   const sendWelcomeEmail = async (email: string, name?: string) => {
//   try {
//     await fetch(
//       `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/send-welcome-email`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, name })
//       }
//     );
//   } catch (err) {
//     console.warn("Welcome email failed (ignored):", err);
//   }
// };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: isLoadingAuth,
        isOnlineAuth: isSupabaseAvailable,
        signUp,
        signIn,
        signInWithGoogle,
        signOut
      }}
    >
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
