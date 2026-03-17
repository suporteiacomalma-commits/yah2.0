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

    // Delete pending daily reminders that have NO events AND placeholders/empty content
    // Categories to remove:
    // 1. Exactly "Nenhum evento" + placeholders
    const { data, error, count } = await supabase
      .from("scheduled_messages")
      .delete({ count: 'exact' })
      .eq("status", "pending")
      .eq("type", "DAILY_REMINDER")
      .like("message", "%Nenhum evento agendado para hoje.%")
      .or('message.ilike.%pendente...%,message.ilike.%Sem tema definido%');

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      deleted_count: count,
      message: `Successfully removed ${count} empty/placeholder pending reminders.`
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 
    });

  } catch (error: any) {
    console.error("Cleanup Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500 
    });
  }
});
