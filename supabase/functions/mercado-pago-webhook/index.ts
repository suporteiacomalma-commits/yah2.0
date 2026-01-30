import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    try {
        const body = await req.json();
        const { type, action, data } = body;

        console.log(`Mercado Pago Webhook - Action: ${action}, Type: ${type}`, JSON.stringify(body));

        // We only care about payment updates
        if (type === "payment" || action === "payment.created" || action === "payment.updated") {
            const paymentId = data?.id || body?.resource?.split("/").pop();

            if (!paymentId) {
                return new Response(JSON.stringify({ error: "No payment ID found" }), { status: 200 });
            }

            const supabaseClient = createClient(
                Deno.env.get("SUPABASE_URL") ?? "",
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            );

            // 1. Get Mercado Pago Access Token
            const { data: settings } = await supabaseClient
                .from("system_settings")
                .select("value")
                .eq("key", "mercado_pago_access_token")
                .single();

            if (!settings?.value) {
                console.error("Mercado Pago Access Token not found in settings");
                return new Response(JSON.stringify({ error: "MP not configured" }), { status: 200 });
            }

            // 2. Fetch Payment Details from Mercado Pago
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    "Authorization": `Bearer ${settings.value}`,
                },
            });

            if (!mpResponse.ok) {
                console.error(`Failed to fetch payment ${paymentId} from MP`);
                return new Response(JSON.stringify({ error: "Failed to fetch from MP" }), { status: 200 });
            }

            const paymentDetails = await mpResponse.json();
            const status = paymentDetails.status;

            console.log(`Payment ${paymentId} status: ${status}`);

            // 3. Update Database if approved
            if (status === "approved") {
                const { error: activationError } = await supabaseClient.rpc("process_payment_activation", {
                    p_external_id: String(paymentId),
                    p_status: "completed",
                });

                if (activationError) {
                    console.error("Activation Error in Webhook:", activationError);
                } else {
                    console.log(`Successfully activated plan for MP payment ${paymentId}`);
                }
            } else if (status === "rejected" || status === "cancelled" || status === "refunded") {
                await supabaseClient.rpc("process_payment_activation", {
                    p_external_id: String(paymentId),
                    p_status: "failed",
                });
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });

    } catch (error) {
        console.error("Webhook Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
});
