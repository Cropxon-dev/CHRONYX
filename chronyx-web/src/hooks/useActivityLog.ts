import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useActivityLog = () => {
  const { user } = useAuth();

  const logActivity = async (action: string, module: string) => {
    if (!user) return;
    
    try {
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action,
        module,
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  return { logActivity };
};
