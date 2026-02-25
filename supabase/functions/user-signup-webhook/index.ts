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

      const justCompletedOnboarding = onboarding_completed === true && oldProfile.onboarding_completed !== true;
      const justBecamePremium = newProfile.subscription_plan === 'premium' && oldProfile.subscription_plan !== 'premium';

      if (!justCompletedOnboarding && !justBecamePremium) {
        console.log("No relevant changes (onboarding or premium upgrade), skipping.");
        return new Response('No relevant changes', { headers: corsHeaders, status: 200 });
      }

      if (!whatsapp) {
        console.log("No WhatsApp number provided for user, skipping message.");
        return new Response('No whatsapp number', { headers: corsHeaders, status: 200 });
      }

      // Fetch WhatsApp settings from system_settings
      const { data: settings, error: settingsError } = await supabaseClient
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'whatsapp_backend_url',
          'whatsapp_token',
          'whatsapp_msg_welcome',
          'whatsapp_msg_day1',
          'whatsapp_msg_post_purchase',
          'whatsapp_msg_day2',
          'whatsapp_msg_day3',
          'whatsapp_msg_day4',
          'whatsapp_msg_day5',
          'whatsapp_msg_day6',
          'whatsapp_msg_day7_15h',
          'whatsapp_msg_day7_19h',
          'whatsapp_msg_post_trial_day1',
          'whatsapp_msg_post_trial_day3',
          'whatsapp_msg_post_trial_day7'
        ]);

      if (settingsError) {
        throw new Error(`Error fetching settings: ${settingsError.message}`);
      }

      const getSetting = (k: string) => settings?.find((s: any) => s.key === k)?.value;
      const waUrl = getSetting('whatsapp_backend_url');
      const waToken = getSetting('whatsapp_token');
      const msgTemplateWelcome = getSetting('whatsapp_msg_welcome');
      const msgPostPurchaseTemplate = getSetting('whatsapp_msg_post_purchase');
      const msgDay1Template = getSetting('whatsapp_msg_day1');
      const msgTemplatesDay2to7: Record<string, string> = {
        'day2': getSetting('whatsapp_msg_day2'),
        'day3': getSetting('whatsapp_msg_day3'),
        'day4': getSetting('whatsapp_msg_day4'),
        'day5': getSetting('whatsapp_msg_day5'),
        'day6': getSetting('whatsapp_msg_day6'),
        'day7_15h': getSetting('whatsapp_msg_day7_15h'),
        'day7_19h': getSetting('whatsapp_msg_day7_19h'),
        'post_trial_day1': getSetting('whatsapp_msg_post_trial_day1'),
        'post_trial_day3': getSetting('whatsapp_msg_post_trial_day3'),
        'post_trial_day7': getSetting('whatsapp_msg_post_trial_day7'),
      };

      if (!waUrl || !waToken) {
        console.warn("WhatsApp integration not fully configured. Missing URL or Token. Skipping.");
        return new Response('WhatsApp not configured', { headers: corsHeaders, status: 200 });
      }

      const firstName = user_name || (full_name ? full_name.split(' ')[0] : 'Usuário');
      const formatMsg = (template: string | undefined): string | null => {
        if (!template) return null;
        return template.replace(/\{\{nome\}\}/gi, firstName).replace(/\{\{nome_completo\}\}/gi, full_name || 'Usuário');
      };

      const actualWelcomeMessage = formatMsg(msgTemplateWelcome);
      const actualDay1Message = formatMsg(msgDay1Template);
      const actualPostPurchaseMessage = formatMsg(msgPostPurchaseTemplate);

      const apiUrl = `${waUrl.replace(/\/$/, '')}/api/messages/whatsmeow/sendTextPRO`;
      let cleanNumber = whatsapp.replace(/\D/g, '');

      if (cleanNumber.length === 10 || cleanNumber.length === 11) {
        cleanNumber = `55${cleanNumber}`;
      }

      const sendMessage = async (body: string, label: string) => {
        console.log(`Sending ${label} WhatsApp message to ${cleanNumber}`);
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
            body: body
          })
        });

        const waData = await waResponse.text();

        if (!waResponse.ok) {
          console.error(`WhatsApp API Error sending ${label} message: ${waResponse.status} ${waData}`);
        } else {
          console.log(`${label} message sent successfully.`);
        }
      };

      if (justCompletedOnboarding && actualWelcomeMessage) {
        await sendMessage(actualWelcomeMessage, "Welcome/Onboarding");

        const messagesToInsert = [];
        const baseDate = new Date();
        const getScheduledTime = (daysOffset: number, hoursUtc: number, minutesUtc: number = 0) => {
          const d = new Date(baseDate);
          d.setDate(d.getDate() + daysOffset);
          d.setUTCHours(hoursUtc, minutesUtc, 0, 0);
          return d.toISOString();
        };

        const schedules = [
          { key: 'day2', time: getScheduledTime(1, 15) },
          { key: 'day3', time: getScheduledTime(2, 15) },
          { key: 'day4', time: getScheduledTime(3, 15) },
          { key: 'day5', time: getScheduledTime(4, 15) },
          { key: 'day6', time: getScheduledTime(5, 15) },
          { key: 'day7_15h', time: getScheduledTime(6, 18) },
          { key: 'day7_19h', time: getScheduledTime(6, 22, 30) },
          { key: 'post_trial_day1', time: getScheduledTime(8, 15) },
          { key: 'post_trial_day3', time: getScheduledTime(10, 15) },
          { key: 'post_trial_day7', time: getScheduledTime(14, 15) },
        ];

        // Add Day 1
        if (actualDay1Message) {
          console.log("Scheduling Day 1 message for 5 minutes from now.");
          const sendAt = new Date();
          sendAt.setMinutes(sendAt.getMinutes() + 5);
          messagesToInsert.push({
            user_id: newProfile.id,
            phone_number: cleanNumber,
            message: actualDay1Message,
            send_at: sendAt.toISOString()
          });
        }

        // Add Day 2 to 7 and Post-Trial
        for (const sched of schedules) {
          const template = msgTemplatesDay2to7[sched.key];
          if (template) {
            const actualMsg = formatMsg(template);
            if (actualMsg) {
              const prefix = sched.key.startsWith('post_trial') ? '[POST_TRIAL]' : '[TRIAL]';
              messagesToInsert.push({
                user_id: newProfile.id,
                phone_number: cleanNumber,
                message: `${prefix}${actualMsg}`,
                send_at: sched.time
              });
            }
          }
        }

        if (messagesToInsert.length > 0) {
          const { error: scheduleError } = await supabaseClient
            .from('scheduled_messages')
            .insert(messagesToInsert);

          if (scheduleError) {
            console.error("Failed to schedule bulk messages:", scheduleError);
          } else {
            console.log(`Scheduled ${messagesToInsert.length} messages successfully.`);
          }
        }
      }

      if (justBecamePremium && actualPostPurchaseMessage) {
        await sendMessage(actualPostPurchaseMessage, "Post-Purchase");
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response('Ignores non-INSERT/UPDATE events', { headers: corsHeaders, status: 200 });
  } catch (error: any) {
    console.error("Error in user-signup-webhook:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
