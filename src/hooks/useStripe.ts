import { useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "./useSystemSettings";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useStripe() {
    const { getSetting } = useSystemSettings();
    const { user } = useAuth();

    const createStripeCheckout = useMutation({
        mutationFn: async (planId: string) => {
            const publishableKey = getSetting("stripe_publishable_key")?.value;
            if (!publishableKey) {
                throw new Error("Stripe Publishable Key not configured.");
            }

            if (!user?.email) throw new Error("User email is required.");

            const stripe = await loadStripe(publishableKey);
            if (!stripe) throw new Error("Failed to load Stripe.");

            const { data, error } = await supabase.functions.invoke('stripe-checkout', {
                body: {
                    planId,
                    userId: user.id,
                    email: user.email,
                    returnUrl: window.location.origin + "/dashboard",
                }
            });

            if (error) throw error;
            if (!data?.url) throw new Error("No checkout URL returned.");

            window.location.href = data.url;
        },
        onError: (error) => {
            console.error("Stripe Checkout Error:", error);
            toast.error("Erro ao iniciar pagamento com cartão.");
        }
    });

    return {
        createStripeCheckout
    };
}
