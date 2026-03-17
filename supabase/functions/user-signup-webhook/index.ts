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

    const logToDb = async (eventName: string, details: any) => {
      try {
        await supabaseClient.from('debug_logs').insert({
          event_name: eventName,
          details: { ...details, user_id: payload.record?.user_id || payload.record?.id }
        });
      } catch (e: any) {
        console.error("Failed to log to DB:", e.message);
      }
    };

    await logToDb("Webhook Received", payload);

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
          'whatsapp_msg_trial',
          'whatsapp_msg_onboarding_5min',
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
          'whatsapp_msg_post_trial_day7',
          'whatsapp_msg_post_purchase_day1',
          'whatsapp_msg_post_purchase_day2',
          'whatsapp_msg_post_purchase_day3',
          'whatsapp_msg_post_purchase_day4',
          'whatsapp_msg_post_purchase_day5',
          'whatsapp_msg_post_purchase_day6',
          'whatsapp_msg_post_purchase_day7'
        ]);

      if (settingsError) {
        throw new Error(`Error fetching settings: ${settingsError.message}`);
      }

      const getSetting = (k: string) => settings?.find((s: any) => s.key === k)?.value;
      const waUrl = getSetting('whatsapp_backend_url');
      const waToken = getSetting('whatsapp_token');
      const msgTemplateTrialWelcome = getSetting('whatsapp_msg_trial'); // For Trial Start
      const msgTemplateOnboarding5min = getSetting('whatsapp_msg_onboarding_5min'); // Action 1
      const msgPostPurchaseTemplate = getSetting('whatsapp_msg_post_purchase');
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
      const msgPostPurchaseSequence: Record<string, string> = {
        'day1': getSetting('whatsapp_msg_post_purchase_day1'),
        'day2': getSetting('whatsapp_msg_post_purchase_day2'),
        'day3': getSetting('whatsapp_msg_post_purchase_day3'),
        'day4': getSetting('whatsapp_msg_post_purchase_day4'),
        'day5': getSetting('whatsapp_msg_post_purchase_day5'),
        'day6': getSetting('whatsapp_msg_post_purchase_day6'),
        'day7': getSetting('whatsapp_msg_post_purchase_day7'),
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

      const actualTrialWelcomeMessage = formatMsg(msgTemplateTrialWelcome);
      const actualOnboarding5minMessage = formatMsg(msgTemplateOnboarding5min);
      const actualPostPurchaseMessage = formatMsg(msgPostPurchaseTemplate);

      const apiUrl = `${waUrl.replace(/\/$/, '')}/api/messages/whatsmeow/sendTextPRO`;
      let cleanNumber = whatsapp.replace(/\D/g, '');

      if (cleanNumber.length === 10 || cleanNumber.length === 11) {
        cleanNumber = `55${cleanNumber}`;
      }

      const sendMessage = async (body: string, label: string) => {
        console.log(`Sending ${label} WhatsApp message to ${cleanNumber}`);
        await logToDb(`Sending ${label}`, { number: cleanNumber, body_preview: body.substring(0, 50) });

        try {
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
            await logToDb(`WhatsApp API Error - ${label}`, { status: waResponse.status, error: waData });
          } else {
            console.log(`${label} message sent successfully.`);
            await logToDb(`${label} Sent Successfully`, { response: waData });
          }
        } catch (fetchError: any) {
          console.error(`Fetch error in ${label}:`, fetchError.message);
          await logToDb(`${label} Fetch Error`, { error: fetchError.message });
        }
      };

      if (justCompletedOnboarding) {
        // 1. Initialize trial status
        const trialStartsAt = new Date();
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        await supabaseClient
          .from('profiles')
          .update({
            subscription_status: 'trialing',
            subscription_plan: 'trial',
            trial_started_at: trialStartsAt.toISOString(),
            trial_ends_at: trialEndsAt.toISOString(),
            timezone: 'America/Sao_Paulo' // Default
          })
          .eq('id', newProfile.id);

        if (actualTrialWelcomeMessage) {
          await sendMessage(actualTrialWelcomeMessage, "Trial Welcome (Immediate)");
        }

        const messagesToInsert = [];
        const baseDate = new Date();
        const getScheduledTime = (daysOffset: number, hoursUtc: number, minutesUtc: number = 0) => {
          // Use Intl to get the current date in Sao Paulo timezone
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
          });
          const parts = formatter.formatToParts(baseDate);
          const getPart = (type: string) => parts.find(p => p.type === type)?.value;

          // Construct a Date object representing midnight in Sao Paulo on the target day
          const brtYear = parseInt(getPart('year') || '0');
          const brtMonth = parseInt(getPart('month') || '0') - 1; // 0-indexed
          const brtDay = parseInt(getPart('day') || '0');

          const d = new Date(Date.UTC(brtYear, brtMonth, brtDay + daysOffset, hoursUtc, minutesUtc, 0, 0));
          return d.toISOString();
        };

        // Rule-aligned schedules (Times shifted for America/Sao_Paulo -3)
        const schedules = [
          // TRIAL_ACTION_1930 (Diário D2-D6 at 19:30 BRT = 22:30 UTC)
          { key: 'day2', type: 'TRIAL_D2', time: getScheduledTime(1, 22, 30) },
          { key: 'day3', type: 'TRIAL_D3', time: getScheduledTime(2, 22, 30) },
          { key: 'day4', type: 'TRIAL_D4', time: getScheduledTime(3, 22, 30) },
          { key: 'day5', type: 'TRIAL_D5', time: getScheduledTime(4, 22, 30) },
          { key: 'day6', type: 'TRIAL_D6', time: getScheduledTime(5, 22, 30) },
          // TRIAL_DAY7_1500 -> Now 19:30 BRT (22:30 UTC) as per request
          { key: 'day7_15h', type: 'TRIAL_D7_1500', time: getScheduledTime(6, 22, 30) },
          // TRIAL_DAY7_1930 (Dia 7, 19:30 BRT = 22:30 UTC)
          { key: 'day7_19h', type: 'TRIAL_D7_1930', time: getScheduledTime(6, 22, 30) },
          // POST_TRIAL -> Unified to 19:30 BRT (22:30 UTC)
          { key: 'post_trial_day1', type: 'POST_TRIAL_D1', time: getScheduledTime(8, 22, 30) },
          { key: 'post_trial_day3', type: 'POST_TRIAL_D3', time: getScheduledTime(10, 22, 30) },
          { key: 'post_trial_day7', type: 'POST_TRIAL_D7', time: getScheduledTime(14, 22, 30) },
        ];

        // FIRST_ACTION_5MIN (TRIAL_D1) - Now using explicit 5-min template
        if (actualOnboarding5minMessage) {
          console.log("Scheduling Onboarding 5min message (Ação 1) for 5 minutes from now.");
          const sendAt = new Date();
          sendAt.setMinutes(sendAt.getMinutes() + 5);
          messagesToInsert.push({
            user_id: newProfile.user_id,
            phone_number: cleanNumber,
            message: actualOnboarding5minMessage,
            send_at: sendAt.toISOString(),
            type: 'TRIAL_D1',
            dedupe_key: `${newProfile.user_id}_TRIAL_D1`
          });
        }

        for (const sched of schedules) {
          const template = msgTemplatesDay2to7[sched.key];
          if (template) {
            const actualMsg = formatMsg(template);
            if (actualMsg) {
              messagesToInsert.push({
                user_id: newProfile.user_id,
                phone_number: cleanNumber,
                message: actualMsg,
                send_at: sched.time,
                type: sched.type,
                dedupe_key: `${newProfile.user_id}_${sched.type}`
              });
            }
          }
        }

        if (messagesToInsert.length > 0) {
          const { error: scheduleError } = await supabaseClient
            .from('scheduled_messages')
            .upsert(messagesToInsert, { onConflict: 'dedupe_key' });

          if (scheduleError) {
            console.error("Failed to schedule bulk messages:", scheduleError);
            await logToDb("Schedule Error", { error: scheduleError });
            throw scheduleError; // Throw so it's caught by the main try/catch and returns 400
          } else {
            console.log(`Scheduled ${messagesToInsert.length} messages successfully.`);
            await logToDb("Schedule Success", { count: messagesToInsert.length });
          }
        }
      }

      if (justBecamePremium) {
        if (actualPostPurchaseMessage) {
          await sendMessage(actualPostPurchaseMessage, "Post-Purchase (Immediate)");
        }

        // 1. Cancel pending TRIAL and POST_TRIAL messages
        const { error: cancelError } = await supabaseClient
          .from('scheduled_messages')
          .delete()
          .eq('user_id', newProfile.user_id)
          .like('type', 'TRIAL_%') // TRIAL_D1, TRIAL_D2, etc.
          .or('type.like.POST_TRIAL_%');

        if (cancelError) {
          console.error("Error cancelling trial messages:", cancelError);
        } else {
          console.log(`Cancelled pending trial/post-trial messages for user ${newProfile.id}`);
        }


        const baseDate = new Date();
        const getScheduledTime = (daysOffset: number, hoursUtc: number, minutesUtc: number = 0) => {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
          });
          const parts = formatter.formatToParts(baseDate);
          const getPart = (type: string) => parts.find(p => p.type === type)?.value;

          const brtYear = parseInt(getPart('year') || '0');
          const brtMonth = parseInt(getPart('month') || '0') - 1;
          const brtDay = parseInt(getPart('day') || '0');

          const d = new Date(Date.UTC(brtYear, brtMonth, brtDay + daysOffset, hoursUtc, minutesUtc, 0, 0));
          return d.toISOString();
        };

        // PAID_1930_D1..D7 (19:30 BRT = 22:30 UTC)
        const postPurchaseSchedules = [
          { key: 'day1', type: 'PAID_D1', time: getScheduledTime(0, 22, 30) }, // Today ~19:30 BRT
          { key: 'day2', type: 'PAID_D2', time: getScheduledTime(1, 22, 30) },
          { key: 'day3', type: 'PAID_D3', time: getScheduledTime(2, 22, 30) },
          { key: 'day4', type: 'PAID_D4', time: getScheduledTime(3, 22, 30) },
          { key: 'day5', type: 'PAID_D5', time: getScheduledTime(4, 22, 30) },
          { key: 'day6', type: 'PAID_D6', time: getScheduledTime(5, 22, 30) },
          { key: 'day7', type: 'PAID_D7', time: getScheduledTime(6, 22, 30) },
        ];

        const premiumMessagesToInsert = [];

        for (const sched of postPurchaseSchedules) {
          const template = msgPostPurchaseSequence[sched.key];
          if (template) {
            const actualMsg = formatMsg(template);
            if (actualMsg) {
              premiumMessagesToInsert.push({
                user_id: newProfile.user_id,
                phone_number: cleanNumber,
                message: actualMsg,
                send_at: sched.time,
                type: sched.type,
                dedupe_key: `${newProfile.user_id}_${sched.type}`
              });
            }
          }
        }

        if (premiumMessagesToInsert.length > 0) {
          const { error: scheduleError } = await supabaseClient
            .from('scheduled_messages')
            .upsert(premiumMessagesToInsert, { onConflict: 'dedupe_key' });

          if (scheduleError) {
            console.error("Failed to schedule bulk premium messages:", scheduleError);
          } else {
            console.log(`Scheduled ${premiumMessagesToInsert.length} premium messages successfully.`);
          }
        }
      }

      await logToDb("Webhook Finished", { success: true });
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
