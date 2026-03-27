import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MercadoPagoConfig, Payment } from "https://esm.sh/mercadopago@2.0.11";

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
        const { 
            planId, userId, email, fullName, cpf, phone, 
            paymentMethodId, token, installments, issuerId, deviceId 
        } = body;

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Get Token
        const { data: settings } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "mercado_pago_access_token")
            .single();

        if (!settings?.value) throw new Error("Mercado Pago Access Token not configured.");

        // 2. Get Plan
        const { data: plan, error: planError } = await supabase
            .from("plans")
            .select("*")
            .eq("id", planId)
            .single();

        if (planError || !plan) throw new Error(`Plan error: ${planError?.message || "Not found"}`);

        // 3. Create Transaction
        const { data: tx, error: txErr } = await supabase
            .from("payment_transactions")
            .insert({
                user_id: userId,
                amount: plan.amount,
                status: "pending",
                payment_method: paymentMethodId || "pix",
                coins: 0,
                plan_id: planId
            })
            .select()
            .single();

        if (txErr) throw new Error(`DB Error: ${txErr.message}`);

        // 4. MP Call using Official SDK
        const client = new MercadoPagoConfig({ 
            accessToken: settings.value,
            options: { timeout: 5000 }
        });
        
        const payment = new Payment(client);

        const mpPayload: any = {
            body: {
                transaction_amount: Number(plan.amount),
                description: `Plano ${plan.name} - YAh`,
                payment_method_id: paymentMethodId || "pix",
                external_reference: tx.id,
                notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`,
                statement_descriptor: "YAH APP", // Max 16 chars, appears on credit card statement
                payer: {
                    email: email,
                    first_name: fullName?.split(' ')[0] || 'Cliente',
                    last_name: fullName?.split(' ').slice(1).join(' ') || 'YAh',
                    identification: {
                        type: "CPF",
                        number: cpf?.replace(/\D/g, "")
                    }
                }
            },
            requestOptions: {
                idempotencyKey: tx.id
            }
        };

        // Add security info if available
        if (deviceId) {
            mpPayload.requestOptions.customHeaders = {
                'X-Meli-Session-Id': deviceId
            };
        }

        // Add credit card specific fields
        if (paymentMethodId !== "pix") {
            mpPayload.body.token = token;
            mpPayload.body.installments = Number(installments) || 1;
            if (issuerId) mpPayload.body.issuer_id = Number(issuerId);
        }

        const result = await payment.create(mpPayload);

        // 5. Update and Return
        await supabase.from("payment_transactions").update({ external_id: String(result.id) }).eq("id", tx.id);

        return new Response(JSON.stringify({
            success: true,
            status: result.status,
            paymentId: result.id,
            internalId: tx.id,
            point_of_interaction: result.point_of_interaction
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        console.error("Function Error:", err);
        let message = err.message || "Unknown error";
        
        // Handle SDK or API error details
        if (err.cause && Array.isArray(err.cause)) {
            message = err.cause.map((c: any) => `${c.code}: ${c.description}`).join('; ');
        }

        return new Response(JSON.stringify({
            success: false,
            error: message
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });
    }
});
