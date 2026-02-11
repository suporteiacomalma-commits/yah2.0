import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";
import { differenceInDays, addDays, addYears, addMonths } from "date-fns";

export interface SubscriptionStatus {
    plan: 'trial' | 'premium';
    status: 'active' | 'expired' | 'cancelled';
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
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

            let calculatedRenewalDate = null;
            if (data.subscription_plan === 'premium') {
                try {
                    const { data: payments } = await (supabase as any)
                        .from("payment_transactions")
                        .select("created_at, plan_id")
                        .in("status", ["paid", "completed", "approved"])
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (payments) {
                        const paidAt = new Date(payments.created_at);
                        if (payments.plan_id === 'plano_anual') {
                            calculatedRenewalDate = addYears(paidAt, 1).toISOString();
                        } else if (payments.plan_id === 'plano_semestral') {
                            calculatedRenewalDate = addMonths(paidAt, 6).toISOString();
                        } else {
                            calculatedRenewalDate = addDays(paidAt, 30).toISOString();
                        }
                    }
                } catch (error) {
                    console.error("Error calculating renewal date:", error);
                }
            }

            const trialEndsAt = data.trial_ends_at;
            const currentPeriodEnd = calculatedRenewalDate;
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
                currentPeriodEnd,
                daysRemaining,
                isExpired,
                isAdmin: !!data.is_admin
            };
        },
        enabled: !!user,
        staleTime: 1000 * 10, // 10 seconds
    });

    return {
        subscription,
        isLoading,
        refetch,
        isPremium: subscription?.plan === 'premium',
        isTrial: subscription?.plan === 'trial',
        isAdmin: subscription?.isAdmin,
        daysRemaining: subscription?.daysRemaining,
        isExpired: subscription?.isExpired,
        currentPeriodEnd: subscription?.currentPeriodEnd,
        trialEndsAt: subscription?.trialEndsAt
    };
}
