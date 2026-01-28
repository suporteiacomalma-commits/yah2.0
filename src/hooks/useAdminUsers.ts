import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./useUserRole";

export interface AdminUser {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  user_name: string | null;
  business_stage: string | null;
  onboarding_completed: boolean;
  created_at: string;
  role?: AppRole;
  subscription_plan?: 'trial' | 'premium';
  subscription_status?: 'active' | 'expired' | 'cancelled';
  trial_ends_at?: string;
  is_admin?: boolean;
  active_plan_id?: string | null;
  bio?: string | null;
  website?: string | null;
}

export function useAdminUsers() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Cast supabase to any to access dynamic columns if types aren't updated yet
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      const usersWithRoles: AdminUser[] = (profiles || []).map((profile: any) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role as AppRole | undefined,
        };
      });

      return usersWithRoles;
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: role,
      });

      if (error) throw error;

      // Also update is_admin flag in profiles for redundancy/ease of access
      if (role === 'admin') {
        await (supabase as any).from("profiles").update({ is_admin: true }).eq("user_id", userId);
      } else {
        await (supabase as any).from("profiles").update({ is_admin: false }).eq("user_id", userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const removeRole = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      await (supabase as any).from("profiles").update({ is_admin: false }).eq("user_id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string, updates: Partial<AdminUser> }) => {
      const { error } = await (supabase as any)
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  });

  const updateUserAuth = useMutation({
    mutationFn: async ({ userId, email, password }: { userId: string, email?: string, password?: string }) => {
      const { error } = await (supabase as any).rpc('admin_update_user_auth', {
        target_user_id: userId,
        new_email: email,
        new_password: password
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  });

  return {
    users: users || [],
    isLoading,
    assignRole,
    removeRole,
    updateSubscription,
    updateUserAuth
  };
}
