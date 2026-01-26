import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

export interface SubscriptionStatus {
    plan: 'trial' | 'premium';
    status: 'active' | 'expired' | 'cancelled';
    trialEndsAt: string | null;
    daysRemaining: number;
    isExpired: boolean;
    isAdmin: boolean;
}

export function useSubscription() {
    const { user } = useAuth();

    const { data: subscription, isLoading, refetch } = useQuery({
        queryKey: ["subscription", user?.id],
        queryFn: async (): Promise<SubscriptionStatus | null> => {
            if (!user) return null;

            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("subscription_plan, subscription_status, trial_ends_at, is_admin")
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Error fetching subscription:", error);
                return null;
            }

            const trialEndsAt = data.trial_ends_at;
            const now = new Date();
            const end = trialEndsAt ? new Date(trialEndsAt) : null;

            // Calculate days remaining (if in trial)
            let daysRemaining = 0;
            let isExpired = false;

            if (data.subscription_plan === 'trial' && end) {
                daysRemaining = differenceInDays(end, now);
                if (daysRemaining < 0) {
                    daysRemaining = 0;
                    isExpired = true;
                }
            }

            // Override expired status if premium
            if (data.subscription_plan === 'premium') {
                isExpired = false;
                daysRemaining = 999;
            }

            // Admin override
            if (data.is_admin) {
                isExpired = false;
                daysRemaining = 999;
            }

            return {
                plan: data.subscription_plan || 'trial',
                status: data.subscription_status || 'active',
                trialEndsAt,
                daysRemaining,
                isExpired,
                isAdmin: !!data.is_admin
            };
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        subscription,
        isLoading,
        refetch,
        isTrial: subscription?.plan === 'trial',
        isPremium: subscription?.plan === 'premium',
        isAdmin: subscription?.isAdmin,
        daysRemaining: subscription?.daysRemaining,
        isExpired: subscription?.isExpired
    };
}
