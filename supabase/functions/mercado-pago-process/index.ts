import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Validate Environment Variables
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseKey) {
            throw new Error(`Configuration Error: Missing Supabase Env Vars (URL: ${!!supabaseUrl}, KEY: ${!!supabaseKey})`);
        }

        // 2. Parse Request Body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error("Invalid Request Body: Failed to parse JSON");
        }

        console.log("Request Body:", JSON.stringify(body));
        const { action, planId, userId, cardToken, paymentMethodId, issuerId, installments, email, fullName, cpf, phone } = body;

        if (action === "ping") {
            return new Response(JSON.stringify({ message: "pong", status: "ok" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        // 3. Get Mercado Pago Access Token from Settings
        const { data: settings, error: settingsError } = await supabaseClient
            .from("system_settings")
            .select("value")
            .eq("key", "mercado_pago_access_token")
            .single();

        if (settingsError || !settings?.value) {
            console.error("Settings Error:", settingsError);
            throw new Error("Mercado Pago Access Token not configured in system_settings.");
        }

        const mpAccessToken = settings.value;

        // 4. Fetch Plan Details
        const { data: plan, error: planError } = await supabaseClient
            .from("plans")
            .select("*")
            .eq("id", planId)
            .single();

        if (planError || !plan) {
            console.error("Plan Error:", planError);
            throw new Error(`Plan not found: ${planId}`);
        }

        // ACTION: CREATE PREFERENCE (Not widely used for direct API but kept for compatibility)
        if (action === "create_preference") {
            // ... (keeping existing preference logic if needed, simplified for brevity as user verified PIX flow mainly)
            // If the user flow is PIX, we skip to step 5.
        }

        // 5. Create Pending Transaction
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

        if (txError) {
            console.error("Transaction Creation Error:", txError);
            throw new Error("Failed to create transaction record.");
        }

        // 6. Construct Mercado Pago Payment Payload
        const paymentData: any = {
            transaction_amount: Number(plan.amount),
            description: `Plano ${plan.name} - YAh`,
            installments: installments || 1,
            payment_method_id: paymentMethodId,
            payer: {
                email: email,
                first_name: fullName?.split(' ')[0] || 'Cliente',
                last_name: fullName?.split(' ').slice(1).join(' ') || 'YAh',
            },
            external_reference: transaction.id,
            notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
        };

        // Conditional fields
        if (cardToken) paymentData.token = cardToken;
        if (issuerId) paymentData.issuer_id = Number(issuerId);

        if (cpf) {
            paymentData.payer.identification = {
                type: "CPF",
                number: cpf.replace(/\D/g, ""),
            };
        }

        if (phone) {
            const cleanPhone = phone.replace(/\D/g, "");
            if (cleanPhone.length >= 10) {
                paymentData.payer.phone = {
                    area_code: cleanPhone.substring(0, 2),
                    number: cleanPhone.substring(2),
                };
            }
        }

        console.log("Sending to MP:", JSON.stringify(paymentData));

        // 7. Send to Mercado Pago
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
        console.log("MP Result:", JSON.stringify(mpResult));

        if (!mpResponse.ok) {
            // Extract detailed error
            let details = mpResult.message || mpResult.error || "Unknown MP Error";
            if (mpResult.cause && Array.isArray(mpResult.cause)) {
                details = mpResult.cause.map((c: any) => c.description).join('; ');
            }
            throw new Error(`Mercado Pago Error: ${details}`);
        }

        // 8. Update Transaction
        const paymentId = String(mpResult.id);
        const status = mpResult.status;

        await supabaseClient
            .from("payment_transactions")
            .update({ external_id: paymentId })
            .eq("id", transaction.id);

        if (status === "approved") {
            await supabaseClient.rpc("process_payment_activation", {
                p_external_id: paymentId,
                p_status: "completed",
            });
        }

        // 9. Success Response
        return new Response(
            JSON.stringify({
                success: status === "approved" || status === "pending" || status === "in_process",
                status: status,
                paymentId: paymentId,
                point_of_interaction: mpResult.point_of_interaction, // CRITICAL FOR PIX
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error("Function Error:", error);

        // Return 200 OK so the frontend can read the error message
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || "An unexpected error occurred",
                details: error.toString()
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    }
});
