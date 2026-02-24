import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, token, number, body, queueId = "45", openTicket = 0 } = await req.json();

    if (!url || !token || !number || !body) {
      throw new Error("Missing required fields");
    }

    const apiUrl = `${url.replace(/\/$/, '')}/api/messages/whatsmeow/sendTextPRO`;

    console.log(`Sending WhatsApp message to ${number} via ${apiUrl}`);

    const waResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        number,
        openTicket,
        queueId,
        body
      })
    });

    const data = await waResponse.text();

    if (!waResponse.ok) {
      console.error(`WhatsApp API Error: ${waResponse.status} ${data}`);
      throw new Error(`WhatsApp API Erro HTTP: ${waResponse.status} - ${data}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in whatsapp-proxy:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
