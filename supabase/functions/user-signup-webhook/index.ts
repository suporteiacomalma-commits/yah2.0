import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json();
    console.log("Webhook payload:", payload);

    if (payload.type === 'UPDATE' && payload.table === 'profiles') {
      const newProfile = payload.record;
      const oldProfile = payload.old_record || {};
      const { full_name, user_name, whatsapp, onboarding_completed } = newProfile;

      // Only fire if onboarding_completed changed from false/null to true
      if (!onboarding_completed || oldProfile.onboarding_completed === true) {
        console.log("Onboarding not completed or already completed, skipping welcome message.");
        return new Response('Onboarding not completed recently', { headers: corsHeaders, status: 200 });
      }

      if (!whatsapp) {
        console.log("No WhatsApp number provided for user, skipping welcome message.");
        return new Response('No whatsapp number', { headers: corsHeaders, status: 200 });
      }

      // Fetch WhatsApp settings from system_settings
      const { data: settings, error: settingsError } = await supabaseClient
        .from('system_settings')
        .select('key, value')
        .in('key', ['whatsapp_backend_url', 'whatsapp_token', 'whatsapp_msg_welcome']);

      if (settingsError) {
        throw new Error(`Error fetching settings: ${settingsError.message}`);
      }

      const getSetting = (k: string) => settings?.find((s: any) => s.key === k)?.value;
      const waUrl = getSetting('whatsapp_backend_url');
      const waToken = getSetting('whatsapp_token');
      const msgTemplate = getSetting('whatsapp_msg_welcome');

      if (!waUrl || !waToken || !msgTemplate) {
        console.warn("WhatsApp integration not fully configured. Skipping welcome message.");
        return new Response('WhatsApp not configured', { headers: corsHeaders, status: 200 });
      }

      // Replace variables in message
      const firstName = user_name || (full_name ? full_name.split(' ')[0] : 'Usuário');
      const actualMessage = msgTemplate.replace(/\{\{nome\}\}/gi, firstName).replace(/\{\{nome_completo\}\}/gi, full_name || 'Usuário');

      // Send WhatsApp Message
      const apiUrl = `${waUrl.replace(/\/$/, '')}/api/messages/whatsmeow/sendTextPRO`;
      let cleanNumber = whatsapp.replace(/\D/g, '');

      // Auto-prepend Brazil country code (55) if it looks like a BR number without it
      if (cleanNumber.length === 10 || cleanNumber.length === 11) {
        cleanNumber = `55${cleanNumber}`;
      }

      console.log(`Sending Welcome WhatsApp message to ${cleanNumber}`);

      const waResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${waToken}`
        },
        body: JSON.stringify({
          number: cleanNumber,
          openTicket: 0,
          queueId: "45",
          body: actualMessage
        })
      });

      const waData = await waResponse.text();

      if (!waResponse.ok) {
        console.error(`WhatsApp API Error sending welcome message: ${waResponse.status} ${waData}`);
        throw new Error(`WhatsApp API Error: ${waResponse.status} - ${waData}`);
      }

      console.log("Welcome message sent successfully.");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response('Ignores non-INSERT events', { headers: corsHeaders, status: 200 });
  } catch (error: any) {
    console.error("Error in user-signup-webhook:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
