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

        // 1) Fetch Settings
        const { data: settings, error: settingsError } = await supabase
            .from("system_settings")
            .select("key, value")
            .in("key", ["whatsapp_backend_url", "whatsapp_token"]);

        if (settingsError) throw new Error(`Settings error: ${settingsError.message}`);

        const getSetting = (k: string) => settings?.find((s: any) => s.key === k)?.value;
        const waUrl = getSetting("whatsapp_backend_url");
        const waToken = getSetting("whatsapp_token");

        if (!waUrl || !waToken) {
            console.warn("WhatsApp integration not fully configured. Missing URL or Token. Skipping.");
            return new Response("WhatsApp not configured", { headers: corsHeaders, status: 200 });
        }

        const apiUrl = `${waUrl.replace(/\/$/, "")}/api/messages/whatsmeow/sendTextPRO`;

        const sendMessage = async (phone: string, body: string, label: string) => {
            let cleanNumber = phone.replace(/\D/g, "");
            if (cleanNumber.length === 10 || cleanNumber.length === 11) {
                cleanNumber = `55${cleanNumber}`;
            }

            console.log(`Sending ${label} WhatsApp message to ${cleanNumber}`);
            const waResponse = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${waToken}`,
                },
                body: JSON.stringify({
                    number: cleanNumber,
                    openTicket: 0,
                    queueId: "45",
                    body: body,
                }),
            });

            if (!waResponse.ok) {
                const errorText = await waResponse.text();
                console.error(`Error sending ${label} via WhatsApp API: ${waResponse.status} ${errorText}`);
                return false;
            }
            return true;
        };


        // 2) Process Scheduled Messages Queue
        const now = new Date();

        console.log("Processing scheduled messages...");
        const { data: pendingMessages, error: pendingError } = await supabase
            .from("scheduled_messages")
            .select("*")
            .eq("status", "pending")
            .lte("send_at", now.toISOString())
            .limit(10); // process 10 at a time to avoid timeouts (sequential process)

        if (pendingError) {
            console.error("Error fetching scheduled messages:", pendingError);
            throw new Error(pendingError.message);
        }

        if (!pendingMessages || pendingMessages.length === 0) {
            console.log("No pending scheduled messages to send.");
            return new Response(JSON.stringify({ success: true, processed: 0 }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        console.log(`Found ${pendingMessages.length} pending scheduled messages.`);

        for (const msg of pendingMessages) {
            try {
                // 1) Fetch user profile to check subscription status (getAccess logic)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('subscription_status, subscription_plan, trial_ends_at')
                    .eq('user_id', msg.user_id)
                    .single();

                const status = profile?.subscription_status || 'expired';

                // Rule: Only trialing or active can receive messages.
                // Exceptions might exist for specific marketing/post-trial types.
                const isTrialExpired = (profile?.subscription_plan === 'trial' || status === 'trialing') && 
                                     profile?.trial_ends_at && 
                                     new Date(profile.trial_ends_at) < new Date();

                let hasAccess = (status === 'trialing' || status === 'active') && !isTrialExpired;

                // Special case: Allow POST_TRIAL messages even if expired
                if (msg.type && (msg.type.startsWith('POST_TRIAL_') || msg.type === 'POST_PURCHASE_MANUAL')) {
                    hasAccess = true;
                }

                if (hasAccess) {
                    // Update to 'sending' to prevent other runs from picking it up
                    await supabase.from("scheduled_messages")
                        .update({ status: 'sending' })
                        .eq("id", msg.id);

                    const success = await sendMessage(msg.phone_number, msg.message, `Scheduled (ID: ${msg.id}, Type: ${msg.type})`);
                    if (success) {
                        await supabase.from("scheduled_messages")
                            .update({ status: 'sent' })
                            .eq("id", msg.id);
                    } else {
                        await supabase.from("scheduled_messages")
                            .update({ status: 'error', error: 'Failed to send via WA API' })
                            .eq("id", msg.id);
                    }
                } else {
                    console.log(`Skipped message ${msg.id} (Type: ${msg.type}) because user status is ${status}`);
                    await supabase.from("scheduled_messages")
                        .update({ status: 'cancelled', error: `Access denied: status ${status}` })
                        .eq("id", msg.id);
                }

            } catch (err: any) {
                console.error(`Error processing message ${msg.id}:`, err.message);
                await supabase.from("scheduled_messages")
                    .update({ status: 'error', error: err.message })
                    .eq("id", msg.id);
            } finally {
                // Note: We used to delete, but now we keep with a status for auditing.
                // However, the query selects pending, so it won't re-process.
            }
        }

        return new Response(JSON.stringify({ success: true, processed: pendingMessages.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Critical error in cron-notifications:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
