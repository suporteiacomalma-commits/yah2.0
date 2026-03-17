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
        const { planId, userId, email, fullName, cpf, phone, paymentMethodId } = body;

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
                payment_method: "pix",
                coins: 0,
                plan_id: planId
            })
            .select()
            .single();

        if (txErr) throw new Error(`DB Error: ${txErr.message}`);

        // 4. MP Call
        const mpPayload = {
            transaction_amount: Number(plan.amount),
            description: `Plano ${plan.name} - YAh`,
            payment_method_id: "pix",
            payer: {
                email: email,
                first_name: fullName?.split(' ')[0] || 'Cliente',
                last_name: fullName?.split(' ').slice(1).join(' ') || 'YAh',
                identification: {
                    type: "CPF",
                    number: cpf?.replace(/\D/g, "")
                }
            },
            external_reference: tx.id,
            notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`
        };

        const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${settings.value}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": tx.id
            },
            body: JSON.stringify(mpPayload)
        });

        const mpResult = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error("Mercado Pago API Error Response:", JSON.stringify(mpResult, null, 2));
            let detail = mpResult.message || "Mercado Pago Error";
            if (mpResult.cause && Array.isArray(mpResult.cause)) {
               detail = mpResult.cause.map((c: any) => `${c.code}: ${c.description}`).join('; ');
            }
            throw new Error(detail);
        }

        // 5. Update and Return
        await supabase.from("payment_transactions").update({ external_id: String(mpResult.id) }).eq("id", tx.id);

        return new Response(JSON.stringify({
            success: true,
            status: mpResult.status,
            paymentId: mpResult.id,
            point_of_interaction: mpResult.point_of_interaction
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        console.error("Function Error:", err.message);
        return new Response(JSON.stringify({
            success: false,
            error: err.message
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });
    }
});
