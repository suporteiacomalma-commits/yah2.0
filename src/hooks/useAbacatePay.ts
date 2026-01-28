import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "./useSystemSettings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AbacatePayProduct {
    externalId: string;
    name: string;
    quantity: number;
    price: number;
}

export interface AbacatePayBillingRequest {
    frequency: "ONE_TIME" | "RECURRING";
    methods: ("PIX")[];
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
                methods: ["PIX"],
                products: [
                    {
                        externalId: params.planId,
                        name: params.name,
                        quantity: 1,
                        price: Math.round(params.amount * 100), // Amount in cents
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

            const responseData = await response.json();
            console.log("AbacatePay Response:", responseData);

            // Handle both HTTP error status and logical errors (success: false)
            if (!response.ok || responseData.success === false) {
                const errorMsg = responseData.error || responseData.message || (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
                console.error("AbacatePay Error Details:", responseData);
                throw new Error(errorMsg || "Failed to create AbacatePay billing");
            }

            // 3. Update transaction with external details
            // Try to find the billing object: it's usually in 'data'
            const billingObj = responseData.data || responseData;

            // Be extremely flexible with finding ID and URL
            const billingId = billingObj.id || billingObj._id || billingObj.publicId || responseData.id;
            const checkoutUrl = billingObj.url || billingObj.checkoutUrl || billingObj.paymentUrl || responseData.url;

            if (!billingId || !checkoutUrl) {
                console.error("Failed to parse AbacatePay success response:", responseData);
                const keys = Object.keys(billingObj).join(", ");
                throw new Error(`Resposta incompleta da API (ID: ${!!billingId}, URL: ${!!checkoutUrl}). Campos encontrados: ${keys}`);
            }

            if (!transaction || !transaction.id) {
                throw new Error("Erro interno: Transação local não encontrada.");
            }

            await (supabase as any)
                .from("payment_transactions")
                .update({
                    external_id: billingId,
                    pix_url: checkoutUrl,
                })
                .eq("id", transaction.id);

            return { id: billingId, url: checkoutUrl };
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
