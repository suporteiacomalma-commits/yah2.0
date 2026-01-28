import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const { event, data } = await req.json()

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Check event type
        // AbacatePay events: billing.paid, billing.declined, etc.
        if (event === 'billing.paid') {
            const billingId = data.id;

            const { error } = await supabaseClient.rpc('process_abacate_pay_payment', {
                p_external_id: billingId,
                p_status: 'completed'
            })

            if (error) throw error;
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }
})
