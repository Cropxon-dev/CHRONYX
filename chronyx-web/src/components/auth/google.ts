// src/components/auth/google.ts
import { supabase } from "@/lib/supabase";

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error("Google sign-in error:", error.message);
    throw error;
  }
}