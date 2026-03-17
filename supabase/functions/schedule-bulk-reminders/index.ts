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

    // 1. Get Params (range)
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) { }

    const targetUserId = body.user_id;

    // Fetch Daily Reminder Template
    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["whatsapp_msg_daily_reminder"]);

    const reminderTemplate = settings?.find((s: any) => s.key === "whatsapp_msg_daily_reminder")?.value;

    if (!reminderTemplate) {
      throw new Error("Daily reminder template not configured in system_settings.");
    }

    // 2. Fetch Users
    const nowStr = new Date().toISOString();
    let userQuery = supabase
      .from("profiles")
      .select("user_id, full_name, whatsapp, subscription_plan, subscription_status, trial_ends_at, timezone")
      .or("subscription_status.eq.active,subscription_status.eq.trialing")
      .neq("whatsapp", null)
      .neq("whatsapp", "")
      .or(`trial_ends_at.is.null,trial_ends_at.gte.${nowStr}`);

    if (targetUserId) {
      userQuery = userQuery.eq("user_id", targetUserId);
    }

    const { data: users, error: usersError } = await userQuery;
    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No active users found to schedule." }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      });
    }

    console.log(`Processing bulk scheduling for ${users.length} users.`);

    // 3. Define Range
    const today = new Date();
    const endDate = new Date(2026, 2, 31); // 2026-03-31

    const totalInserted = [];
    
    for (const user of users) {
      const userTz = user.timezone || 'America/Sao_Paulo';
      
      // Fetch user data once
      const { data: events } = await supabase
        .from("eventos_do_cerebro")
        .select("titulo, hora, data, dias_da_semana, recorrencia, status, concluidos, exclusoes")
        .eq("user_id", user.user_id);

      const { data: brandData } = await supabase
        .from("brands")
        .select("weekly_structure_data")
        .eq("user_id", user.user_id)
        .single();

      const userMessages = [];

      // Iterate from tomorrow until endDate
      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        // We start from d + 1 (tomorrow)
        if (d.toDateString() === today.toDateString()) continue;

        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayOfWeek = d.getDay(); // 0-6

        // Calculate agenda for this specific date 'd'
        const todaysEvents = (events || []).filter((e: any) => {
          const eventDate = e.data;
          if (!eventDate) return false;

          const localDateStr = dateStr;

          if (Array.isArray(e.concluidos) && e.concluidos.includes(localDateStr)) return false;
          if (Array.isArray(e.exclusoes) && e.exclusoes.includes(localDateStr)) return false;
          if (e.recorrencia === 'Nenhuma' && e.status === 'Concluído' && eventDate === localDateStr) return false;

          const matchesDate = eventDate === localDateStr;
          let isRecurringMatch = false;

          if (eventDate <= localDateStr && (e.recorrencia !== 'Nenhuma' || e.is_recurring)) {
            if (e.recorrencia === 'Diária') {
              isRecurringMatch = true;
            } else if (e.recorrencia === 'Semanal') {
              if (Array.isArray(e.dias_da_semana) && e.dias_da_semana.length > 0) {
                isRecurringMatch = e.dias_da_semana.includes(dayOfWeek);
              } else {
                const origDate = new Date(eventDate + "T12:00:00Z");
                isRecurringMatch = origDate.getUTCDay() === dayOfWeek;
              }
            } else if (e.recorrencia === 'Mensal') {
              isRecurringMatch = parseInt(eventDate.split('-')[2]) === d.getDate();
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

        // Content logic
        let contentStr = "•  Nenhum conteúdo planejado para hoje.";
        if (brandData?.weekly_structure_data) {
          const weeklyData = brandData.weekly_structure_data as any[];
          const weekIdx = 0; // Dashboard alignment
          if (Array.isArray(weeklyData) && weeklyData[weekIdx] && weeklyData[weekIdx][dayOfWeek]) {
            const dayData = weeklyData[weekIdx][dayOfWeek];
            const mainFeed = dayData.feed?.headline;
            const mainStory = dayData.stories?.headline;
            if (mainFeed || mainStory) {
              contentStr = `•  Feed: ${mainFeed || 'Sem tema definido'}\n•  Stories: ${mainStory || 'Sem tema definido'}`;
            }
          }
        }

        const nomeFirstName = (user.full_name || "").split(" ")[0] || "Usuário";
        const messageToSend = reminderTemplate
          .replace(/\{\{nome\}\}/g, nomeFirstName)
          .replace(/\{\{nome_completo\}\}/g, user.full_name || "")
          .replace(/\{\{lista_agenda\}\}/g, eventStr)
          .replace(/\{\{lista_conteudo\}\}/g, contentStr);

        // Targeted at 07:30 BRT (10:30 UTC)
        const sendAt = `${dateStr}T10:30:00Z`;

        userMessages.push({
          user_id: user.user_id,
          phone_number: user.whatsapp,
          message: messageToSend,
          send_at: sendAt,
          status: 'pending',
          type: 'DAILY_REMINDER',
          dedupe_key: `DAILY_REMINDER_${user.user_id}_${dateStr}`
        });
      }

      if (userMessages.length > 0) {
        const { error: insertError } = await supabase
          .from("scheduled_messages")
          .upsert(userMessages, { onConflict: 'dedupe_key' });
        
        if (insertError) {
          console.error(`Error inserting for user ${user.user_id}:`, insertError);
        } else {
          totalInserted.push(user.user_id);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      users_processed: totalInserted.length,
      message: `Scheduled daily reminders until 2026-03-31 for ${totalInserted.length} users.`
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 
    });

  } catch (error: any) {
    console.error("Bulk Scheduling Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500 
    });
  }
});
