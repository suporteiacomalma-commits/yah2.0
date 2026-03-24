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
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Get User from Authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");

        const { data: { user }, error: userError } = await supabase.auth.getUser(
            authHeader.replace("Bearer ", "")
        );
        if (userError || !user) throw new Error("Invalid user session");

        console.log(`Cancelling subscription for user: ${user.id}`);

        // 1. Call the Database RPC
        const { error: rpcError } = await supabase.rpc("cancel_user_subscription", {
            p_user_id: user.id
        });

        if (rpcError) throw rpcError;

        // 2. TODO: If Stripe/MP recurring subscriptions are implemented, 
        // add logic here to cancel them via their respective APIs.
        // For now, updating the DB handles the "renewal" display and status.

        return new Response(JSON.stringify({ success: true, message: "Subscription cancelled successfully" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        console.error("Cancellation error:", err.message);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400
        });
    }
});
