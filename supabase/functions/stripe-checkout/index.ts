import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
        const { planId, userId, email, returnUrl } = await req.json();

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        // 1. Get Stripe Secret Key from Settings
        const { data: settings } = await supabaseClient
            .from("system_settings")
            .select("value")
            .eq("key", "stripe_secret_key")
            .single();

        if (!settings?.value) {
            throw new Error("Stripe is not configured.");
        }

        const stripe = new Stripe(settings.value, {
            apiVersion: "2023-10-16",
        });

        // 2. Fetch Plan Details
        const { data: plan, error: planError } = await supabaseClient
            .from("plans")
            .select("*")
            .eq("id", planId)
            .single();

        if (planError || !plan) {
            throw new Error("Plan not found");
        }

        // 3. Create Pending Transaction
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

        // 4. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "brl",
                        product_data: {
                            name: plan.name,
                            description: plan.description || undefined,
                        },
                        unit_amount: Math.round(plan.amount * 100), // Cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${returnUrl}?success=true`,
            cancel_url: `${returnUrl}?canceled=true`,
            customer_email: email,
            client_reference_id: transaction.id,
            metadata: {
                userId: userId,
                planId: planId,
                transactionId: transaction.id,
            },
        });

        // 5. Update Transaction with Session ID
        const { error: updateError } = await supabaseClient
            .from("payment_transactions")
            .update({
                external_id: session.id,
                pix_url: session.url // Storing checkout URL in generic field
            })
            .eq("id", transaction.id);

        if (updateError) console.error("Failed to update transaction with session ID", updateError);

        return new Response(
            JSON.stringify({ url: session.url }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
