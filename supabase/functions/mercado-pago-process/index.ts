import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        console.log("Request Body:", body);
        const { action, planId, userId, cardToken, paymentMethodId, issuerId, installments, email, fullName, cpf, phone } = body;

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        // 1. Get Mercado Pago Access Token from Settings
        const { data: settings } = await supabaseClient
            .from("system_settings")
            .select("value")
            .eq("key", "mercado_pago_access_token")
            .single();

        if (!settings?.value) {
            throw new Error("Mercado Pago is not configured.");
        }

        const mpAccessToken = settings.value;

        // 2. Fetch Plan Details
        const { data: plan, error: planError } = await supabaseClient
            .from("plans")
            .select("*")
            .eq("id", planId)
            .single();

        if (planError || !plan) {
            throw new Error("Plan not found");
        }

        // NEW: ACTION - CREATE PREFERENCE
        if (action === "create_preference") {
            const preferenceData = {
                items: [
                    {
                        title: `Plano ${plan.name} - YAh`,
                        quantity: 1,
                        unit_price: Number(plan.amount),
                        currency_id: "BRL",
                    },
                ],
                payer: {
                    email: email,
                },
                payment_methods: {
                    installments: 12,
                },
                external_reference: `pref_${Date.now()}`,
                back_urls: {
                    success: `${Deno.env.get("SUPABASE_URL")}/dashboard`,
                    failure: `${Deno.env.get("SUPABASE_URL")}/dashboard`,
                    pending: `${Deno.env.get("SUPABASE_URL")}/dashboard`,
                },
                auto_return: "approved",
            };

            console.log("Creating preference:", JSON.stringify(preferenceData));

            const prefResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${mpAccessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(preferenceData),
            });

            const prefResult = await prefResponse.json();
            if (!prefResponse.ok) throw new Error(prefResult.message || "Failed to create preference");

            return new Response(JSON.stringify({ preferenceId: prefResult.id }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 3. Create Pending Transaction (Existing Flow)
        const { data: transaction, error: txError } = await supabaseClient
            .from("payment_transactions")
            .insert({
                user_id: userId,
                amount: plan.amount,
                coins: 0,
                plan_id: planId,
                status: "pending",
            })
            .select()
            .single();

        if (txError) throw txError;

        // 4. Create Mercado Pago Payment
        const paymentData: any = {
            transaction_amount: Number(plan.amount),
            token: cardToken,
            description: `Plano ${plan.name} - YAh`,
            installments: installments || 1,
            payment_method_id: paymentMethodId,
            payer: {
                email: email,
                first_name: fullName?.split(' ')[0] || 'Cliente',
                last_name: fullName?.split(' ').slice(1).join(' ') || 'YAh',
            },
            external_reference: transaction.id,
            notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`,
        };

        if (issuerId) {
            paymentData.issuer_id = Number(issuerId);
        }

        // Add Identification (CPF) if provided
        if (cpf) {
            paymentData.payer.identification = {
                type: "CPF",
                number: cpf.replace(/\D/g, ""), // Remove non-digits
            };
        }

        // Add Phone if provided
        if (phone) {
            paymentData.payer.phone = {
                number: phone.replace(/\D/g, ""),
            };
        }

        console.log("Sending to Mercado Pago:", JSON.stringify(paymentData, null, 2));

        const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${mpAccessToken}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": transaction.id,
            },
            body: JSON.stringify(paymentData),
        });

        const mpResult = await mpResponse.json();
        console.log("Mercado Pago Full Response:", JSON.stringify(mpResult, null, 2));

        if (!mpResponse.ok) {
            const errorMsg = mpResult.message || mpResult.error || "Erro ao processar pagamento no Mercado Pago";
            console.error("Mercado Pago API Error:", mpResult);
            throw new Error(errorMsg);
        }

        // 5. Update Transaction with MP ID
        const paymentId = String(mpResult.id);
        const status = mpResult.status; // approved, in_process, rejected, etc.

        await supabaseClient
            .from("payment_transactions")
            .update({
                external_id: paymentId,
            })
            .eq("id", transaction.id);

        // 6. If approved immediately, activate the plan
        if (status === "approved") {
            const { error: activationError } = await supabaseClient.rpc("process_payment_activation", {
                p_external_id: paymentId,
                p_status: "completed",
            });

            if (activationError) {
                console.error("Activation Error:", activationError);
                // We don't throw here because the payment WAS approved, 
                // we just failed to update the DB, which the webhook might fix.
            }
        }

        return new Response(
            JSON.stringify({
                success: status === "approved",
                status: status,
                paymentId: paymentId
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        console.error("Payment Process Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
