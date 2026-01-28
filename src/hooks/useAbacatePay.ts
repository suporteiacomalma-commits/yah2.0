import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "./useSystemSettings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AbacatePayProduct {
    externalId: string;
    name: string;
    quantity: number;
    priceUnit: number;
}

export interface AbacatePayBillingRequest {
    frequency: "ONE_TIME" | "RECURRING";
    methods: ("PIX" | "CARD")[];
    products: AbacatePayProduct[];
    returnUrl: string;
    completionUrl: string;
    customer?: {
        name?: string;
        email: string;
        taxId?: string;
    };
}

export function useAbacatePay() {
    const { getSetting } = useSystemSettings();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const createBilling = useMutation({
        mutationFn: async (params: { planId: string; name: string; amount: number; frequency: "ONE_TIME" | "RECURRING" }) => {
            const apiKey = getSetting("abacate_pay_api_key")?.value;
            if (!apiKey) {
                throw new Error("AbacatePay API Key not configured.");
            }

            if (!user?.email) throw new Error("User email is required.");

            // 1. Create a pending transaction in our DB
            const { data: transaction, error: txError } = await (supabase as any)
                .from("payment_transactions")
                .insert({
                    user_id: user.id,
                    amount: params.amount,
                    coins: 0,
                    plan_id: params.planId,
                    status: "pending",
                })
                .select()
                .single();

            if (txError) throw txError;

            // 2. Call AbacatePay API
            const requestBody: AbacatePayBillingRequest = {
                frequency: params.frequency,
                methods: ["PIX", "CARD"],
                products: [
                    {
                        externalId: params.planId,
                        name: params.name,
                        quantity: 1,
                        priceUnit: Math.round(params.amount * 100), // Amount in cents
                    },
                ],
                returnUrl: window.location.origin + "/dashboard",
                completionUrl: window.location.origin + "/dashboard?success=true",
                // Removing customer object because if email is provided, 
                // AbacatePay requires name, cellphone, and taxId too.
                // It's better to let the checkout page collect these.
            };

            const response = await fetch("https://api.abacatepay.com/v1/billing/create", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "accept": "application/json"
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("AbacatePay Error Details:", errorData);
                throw new Error(errorData.message || JSON.stringify(errorData) || "Failed to create AbacatePay billing");
            }

            const data = await response.json();

            // 3. Update transaction with external details
            // Assuming response has 'data' object with 'url' and 'id'
            const billing = data.data;

            await (supabase as any)
                .from("payment_transactions")
                .update({
                    external_id: billing.id,
                    pix_url: billing.url,
                    // If we had pix_code (copy/paste) we'd add it here
                })
                .eq("id", transaction.id);

            return billing;
        },
        onSuccess: (data) => {
            // Redirect to checkout URL or open in new tab
            if (data.url) {
                window.open(data.url, "_blank");
                toast.success("Link de pagamento gerado!");
            }
        },
        onError: (error: any) => {
            toast.error(`Erro ao processar pagamento: ${error.message}`);
        },
    });

    return {
        createBilling,
    };
}
