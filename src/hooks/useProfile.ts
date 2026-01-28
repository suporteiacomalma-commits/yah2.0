import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  user_name: string | null;
  business_stage: string | null;
  main_goal: string | null;
  onboarding_completed: boolean;
  coins: number;
  subscription_plan: 'trial' | 'premium' | null;
  subscription_status: 'active' | 'inactive' | 'expired' | null;
  trial_ends_at: string | null;
  cellphone: string | null;
  tax_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (error: any) => {
      import("sonner").then(({ toast }) => {
        toast.error("Erro ao atualizar perfil: " + error.message);
      });
    }
  });

  return {
    profile,
    isLoading,
    updateProfile,
  };
}
