import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const url = new URL(req.url)
        const querySecret = url.searchParams.get('webhookSecret')
        const webhookSecret = Deno.env.get('ABACATEPAY_WEBHOOK_SECRET')

        if (webhookSecret && querySecret !== webhookSecret) {
            console.error('Invalid webhook secret provided in query params')
            return new Response(JSON.stringify({ error: 'Invalid secret' }), { status: 401 })
        }

        const body = await req.json()
        const { event, data } = body

        console.log(`Received event: ${event}`, JSON.stringify(body))

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Check event type
        // AbacatePay events: billing.paid, billing.declined, etc.
        if (event === 'billing.paid') {
            const billingId = data.billing?.id || data.payment?.id || data.id;

            if (!billingId) {
                console.error('No billing ID found in payload:', JSON.stringify(data));
                return new Response(JSON.stringify({ error: 'No billing ID found' }), { status: 200 }); // Return 200 to acknowledge but log error
            }

            console.log(`Processing payment for billing: ${billingId}`);

            const { error } = await supabaseClient.rpc('process_abacate_pay_payment', {
                p_external_id: billingId,
                p_status: 'completed'
            })

            if (error) {
                console.error('RPC Error:', error);
                throw error;
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }
})
