import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return new Response("No signature provided", { status: 400 });
    }

    try {
        const body = await req.text();

        // Create Supabase Client with Service Role to access sensitive settings and run internal logic
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        // 1. Fetch Stripe Settings from DB
        const { data: settings } = await supabaseClient
            .from("system_settings")
            .select("key, value")
            .in("key", ["stripe_secret_key", "stripe_webhook_secret"]);

        const stripeKey = settings?.find(s => s.key === "stripe_secret_key")?.value;
        const webhookSecret = settings?.find(s => s.key === "stripe_webhook_secret")?.value;

        if (!stripeKey || !webhookSecret) {
            console.error("Stripe is not configured in system_settings.");
            return new Response("Stripe configuration missing", { status: 500 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

        // 2. Verify Webhook Signature
        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            console.error(`Webhook signature verification failed.`, err.message);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        // 3. Handle Event
        console.log(`Received Stripe event: ${event.type}`);

        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
            const session = event.data.object;
            const externalId = session.id;

            console.log(`Processing session ${event.type}: ${externalId}`);

            // Call RPC to activate plan
            const { error, data: rpcData } = await supabaseClient.rpc("process_payment_activation", {
                p_external_id: externalId,
                p_status: "completed"
            });

            if (error) {
                console.error("Error activating payment via RPC:", error);
                return new Response(JSON.stringify({ error: "RPC Failure", detail: error.message }), { status: 500 });
            }

            console.log(`RPC Result for ${externalId}:`, rpcData);
        } else {
            console.log(`Ignored event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true, type: event.type }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Webhook critical error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
