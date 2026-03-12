import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Missing Supabase configuration");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Find users whose trial has expired
        const now = new Date().toISOString();

        console.log(`Checking for expired trials at ${now}...`);

        const { data: expiredUsers, error: fetchError } = await supabase
            .from("profiles")
            .select("id, user_id, full_name")
            .or("subscription_status.eq.trialing,subscription_status.eq.active") // Check both statuses
            .eq("subscription_plan", "trial") // Ensure it only affects trial plans
            .lt("trial_ends_at", now);

        if (fetchError) {
            throw new Error(`Error fetching expired users: ${fetchError.message}`);
        }

        if (!expiredUsers || expiredUsers.length === 0) {
            console.log("No trials expired since last run.");
            return new Response(JSON.stringify({ success: true, expired: 0 }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        console.log(`Found ${expiredUsers.length} expired trials. Updating status...`);

        // 2. Update status to 'expired'
        const userIds = expiredUsers.map(u => u.id);
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ subscription_status: "expired" })
            .in("id", userIds);

        if (updateError) {
            throw new Error(`Error updating expired users: ${updateError.message}`);
        }

        console.log(`Successfully expired ${expiredUsers.length} users.`);

        return new Response(JSON.stringify({ success: true, expired: expiredUsers.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Critical error in cron-trial-manager:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
