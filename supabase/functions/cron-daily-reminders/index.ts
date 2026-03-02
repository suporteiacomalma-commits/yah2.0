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

    // Fetch Settings
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["whatsapp_backend_url", "whatsapp_token", "whatsapp_msg_daily_reminder"]);

    if (settingsError) throw new Error(`Settings error: ${settingsError.message}`);

    const getSetting = (k: string) => settings?.find((s: any) => s.key === k)?.value;
    const waUrl = getSetting("whatsapp_backend_url");
    const waToken = getSetting("whatsapp_token");
    const reminderTemplate = getSetting("whatsapp_msg_daily_reminder");

    if (!waUrl || !waToken) {
      console.warn("WhatsApp integration not fully configured. Missing URL or Token.");
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), { headers: corsHeaders, status: 200 });
    }

    if (!reminderTemplate) {
      console.warn("Daily reminder template not configured.");
      return new Response(JSON.stringify({ error: "Template not configured" }), { headers: corsHeaders, status: 200 });
    }

    // Test mode parameters
    let reqBody: any = {};
    if (req.method === "POST") {
      try {
        reqBody = await req.json();
      } catch (e) {
        // Ignore JSON parse error for empty body
      }
    }

    const isTest = !!reqBody.test_whatsapp;
    const testUserId = reqBody.test_user_id;

    // Fetch active users
    let query = supabase
      .from("profiles")
      .select("user_id, full_name, whatsapp, subscription_plan, subscription_status, created_at");

    if (isTest && testUserId) {
      query = query.eq("user_id", testUserId);
    } else {
      query = query
        .eq("subscription_status", "active")
        .neq("whatsapp", null)
        .neq("whatsapp", "");
    }

    let { data: users, error: usersError } = await query;

    if (usersError) throw new Error(`Users fetch error: ${usersError.message}`);

    if (isTest && (!users || users.length === 0)) {
      console.warn(`Test user ${testUserId} has no profile. Falling back to any active user for data mapping.`);
      const { data: fallbackUsers } = await supabase
        .from("profiles")
        .select("user_id, full_name, whatsapp, subscription_plan, subscription_status, created_at")
        .limit(1);

      if (fallbackUsers && fallbackUsers.length > 0) {
        users = fallbackUsers;
      }
    }

    console.log(`Found ${users?.length || 0} active users with valid whatsapp numbers.`);

    const todayTimestamp = new Date();
    const startOfToday = new Date(todayTimestamp.getFullYear(), todayTimestamp.getMonth(), todayTimestamp.getDate());

    let sentCount = 0;
    let skipCount = 0;

    for (const user of users || []) {
      try {
        // Determine if user is in day 0
        const userCreated = new Date(user.created_at);
        const userCreatedAtStart = new Date(userCreated.getFullYear(), userCreated.getMonth(), userCreated.getDate());

        const diffTime = startOfToday.getTime() - userCreatedAtStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (!isTest && diffDays <= 0) {
          console.log(`Skipping user ${user.user_id} (Day 0)`);
          skipCount++;
          continue;
        }

        // Fetch today's agenda (eventos_do_cerebro)
        const { data: events, error: eventsError } = await supabase
          .from("eventos_do_cerebro")
          .select("titulo, hora, data, dias_da_semana, recorrencia, status")
          .eq("user_id", user.user_id);

        if (eventsError) console.error(`Error fetching events for ${user.user_id}:`, eventsError);

        const tzOffset = -3;
        const localTime = new Date(todayTimestamp.getTime() + tzOffset * 3600 * 1000);
        const currentDateStr = localTime.toISOString().split('T')[0];
        const currentDayOfWeek = localTime.getUTCDay();

        const todaysEvents = (events || []).filter((e: any) => {
          const eventDate = e.data;
          if (!eventDate) return false;

          const localDateStr = currentDateStr; // 'YYYY-MM-DD'

          // Check if already completed for today (for recurring events)
          if (Array.isArray(e.concluidos) && e.concluidos.includes(localDateStr)) {
            return false;
          }

          // Check if excluded for today
          if (Array.isArray(e.exclusoes) && e.exclusoes.includes(localDateStr)) {
            return false;
          }

          // For non-recurring, check status
          if (e.recorrencia === 'Nenhuma' && e.status === 'Concluído' && eventDate === localDateStr) {
            return false;
          }

          const matchesDate = eventDate === localDateStr;
          let isRecurringMatch = false;

          if (eventDate <= localDateStr && (e.recorrencia !== 'Nenhuma' || e.is_recurring)) {
            // Basic parity with recurrenceUtils.ts
            if (e.recorrencia === 'Diária') {
              isRecurringMatch = true;
            } else if (e.recorrencia === 'Semanal') {
              if (Array.isArray(e.dias_da_semana) && e.dias_da_semana.length > 0) {
                isRecurringMatch = e.dias_da_semana.includes(currentDayOfWeek);
              } else {
                // parseISO equivalent in pure JS for neutral YYYY-MM-DD
                const origDate = new Date(eventDate + "T12:00:00Z");
                isRecurringMatch = origDate.getUTCDay() === currentDayOfWeek;
              }
            } else if (e.recorrencia === 'Mensal') {
              isRecurringMatch = parseInt(eventDate.split('-')[2]) === localTime.getUTCDate();
            } else if (e.recorrencia === 'Anual') {
              isRecurringMatch = eventDate.substring(5) === localDateStr.substring(5);
            }
          }

          return matchesDate || isRecurringMatch;
        }).sort((a: any, b: any) => (a.hora || '23:59:59').localeCompare(b.hora || '23:59:59'));

        let eventStr = "•  Nenhum evento agendado para hoje.";
        if (todaysEvents.length > 0) {
          eventStr = todaysEvents.map((e: any) => {
            const timeStr = e.hora ? e.hora.substring(0, 5) : 'O Dia Todo';
            return `•  ${timeStr} - ${e.titulo}`;
          }).join('\n');
        }

        // Fetch Brand Content for Feed/Stories (from brands table)
        // Dashboard uses week 0 (Week 1)
        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .select("weekly_structure_data")
          .eq("user_id", user.user_id)
          .single();

        if (brandError && brandError.code !== 'PGRST116') {
          console.error(`Error fetching brand for ${user.user_id}:`, brandError);
        }

        let contentBlocks: string[] = [];

        if (brandData && brandData.weekly_structure_data) {
          const weekIdx = 0; // Dashboard alignment: Always use Week 1
          const dayIdx = currentDayOfWeek; // 0-6

          const weeklyData = brandData.weekly_structure_data as any[];
          if (Array.isArray(weeklyData) && weeklyData[weekIdx] && weeklyData[weekIdx][dayIdx]) {
            const dayData = weeklyData[weekIdx][dayIdx];

            const mainFeed = dayData.feed?.headline;
            const mainStory = dayData.stories?.headline;
            if (mainFeed || mainStory) {
              contentBlocks.push(`•  Feed: ${mainFeed || 'Sem tema definido'}\n•  Stories: ${mainStory || 'Sem tema definido'}`);
            }
          }
        }

        let contentStr = contentBlocks.length > 0 ? contentBlocks.join('\n\n') : "•  Nenhum conteúdo planejado para hoje.";

        const nomeFirstName = (user.full_name || "").split(" ")[0] || "Usuário";

        let messageToSend = reminderTemplate
          .replace(/\{\{nome\}\}/g, nomeFirstName)
          .replace(/\{\{nome_completo\}\}/g, user.full_name || "")
          .replace(/\{\{lista_agenda\}\}/g, eventStr)
          .replace(/\{\{lista_conteudo\}\}/g, contentStr);

        let whatsappToSend = user.whatsapp;
        if (isTest) {
          whatsappToSend = reqBody.test_whatsapp;
        }

        // Send via Whatsapp Proxy
        const success = await sendMessage(waUrl, waToken, whatsappToSend, messageToSend, `Daily Reminder ${user.user_id}`);
        if (success) sentCount++;

        if (isTest) {
          return new Response(JSON.stringify({
            success: true,
            sent: 1,
            message: messageToSend,
            user: user.full_name,
            events_count: todaysEvents.length,
            content_found: contentBlocks.length > 0
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

      } catch (err: any) {
        console.error(`Error processing user ${user.user_id}:`, err);
        if (isTest) {
          return new Response(JSON.stringify({
            success: false,
            error: `Runtime Exception: ${err.message}`,
            stack: err.stack,
            sent: 0
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sent: sentCount,
      skipped: skipCount,
      users_found: users?.length || 0,
      testUserId: testUserId || null,
      debugMessage: isTest ? 'Message sent to WhatsApp proxy. Check proxy logs or phone.' : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function sendMessage(url: string, token: string, number: string, message: string, logRef: string) {
  let cleanNumber = number.replace(/\D/g, '');
  if (!cleanNumber.startsWith('55')) {
    cleanNumber = '55' + cleanNumber;
  }

  const apiUrl = `${url.replace(/\/$/, '')}/api/messages/whatsmeow/sendTextPRO`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        number: cleanNumber,
        openTicket: 0,
        queueId: "45",
        body: message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error sending message to ${cleanNumber}: ${response.status} ${errorText}`);
      return false;
    }

    const rs = await response.text();
    console.log(`[WhatsApp] Sent text (${logRef}) to ${cleanNumber}:`, rs);
    return true;
  } catch (err: any) {
    console.error(`[WhatsApp] Exception sending text (${logRef}) to ${cleanNumber}:`, err.message);
    return false;
  }
}
