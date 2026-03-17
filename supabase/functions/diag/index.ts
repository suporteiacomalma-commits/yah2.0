import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Check plans table
        const { data: plans, error: plansError } = await supabase.from("plans").select("*").limit(5);
        
        // Check payment_transactions table
        const { data: columns, error: colError } = await supabase.rpc('get_table_info', { table_name: 'payment_transactions' }).catch(() => ({ data: null, error: 'RPC missing' }));

        return new Response(JSON.stringify({ 
            plans, 
            plansError,
            db_info: "Probed"
        }), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200 
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
    }
});
