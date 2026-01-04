import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface CustomBank {
  id: string;
  user_id: string;
  name: string;
  full_name: string;
  color: string;
  logo_url: string | null;
  country: string;
  created_at: string;
}

export const useCustomBanks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customBanks = [], isLoading } = useQuery({
    queryKey: ["custom-banks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("custom_banks")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (error) throw error;
      return data as CustomBank[];
    },
    enabled: !!user,
  });

  const addCustomBank = useMutation({
    mutationFn: async (bank: {
      name: string;
      full_name: string;
      color?: string;
      logo_url?: string;
      country: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("custom_banks")
        .insert({
          user_id: user.id,
          name: bank.name,
          full_name: bank.full_name,
          color: bank.color || "#6366f1",
          logo_url: bank.logo_url || null,
          country: bank.country,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as CustomBank;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-banks"] });
    },
  });

  return {
    customBanks,
    isLoading,
    addCustomBank,
  };
};
