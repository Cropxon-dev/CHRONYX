import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const run = async () => {
      try {
        await supabase.auth.exchangeCodeForSession();
        window.location.href = "/app";   // or /login if you prefer
      } catch (e) {
        window.location.href = "/login";
      }
    };

    run();
  }, []);

  return <p>Finishing sign-in…</p>;
}
