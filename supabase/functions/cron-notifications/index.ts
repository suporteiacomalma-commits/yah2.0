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
            .lte("send_at", now.toISOString())
            .limit(50); // process 50 at a time

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
                // Fetch user profile to check subscription plan
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('subscription_plan')
                    .eq('id', msg.user_id)
                    .single();

                const plan = profile?.subscription_plan || 'trial';

                let shouldSend = true;
                let finalMessage = msg.message;

                // Check conditions for Trial and Post-Trial messages
                if (typeof finalMessage === 'string') {
                    if (finalMessage.startsWith('[TRIAL]')) {
                        finalMessage = finalMessage.replace('[TRIAL]', '');
                        if (plan === 'premium') shouldSend = false;
                    } else if (finalMessage.startsWith('[POST_TRIAL]')) {
                        finalMessage = finalMessage.replace('[POST_TRIAL]', '');
                        if (plan === 'premium') shouldSend = false;
                    }
                }

                if (shouldSend) {
                    const success = await sendMessage(msg.phone_number, finalMessage, `Scheduled (ID: ${msg.id})`);
                    if (!success) {
                        console.error(`Failed to send message ${msg.id}`);
                    }
                } else {
                    console.log(`Skipped message ${msg.id} because user plan is ${plan}`);
                }

            } catch (err: any) {
                console.error(`Error processing message ${msg.id}:`, err.message);
            } finally {
                // Always delete after processing to prevent retry loops
                await supabase.from("scheduled_messages").delete().eq("id", msg.id);
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
