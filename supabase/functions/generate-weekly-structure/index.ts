
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { brand, routine, apiKey: bodyApiKey } = await req.json()

        if (!brand || !routine) {
            throw new Error('Brand context and routine data are required')
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY') || bodyApiKey
        if (!apiKey) {
            throw new Error('OpenAI API Key not configured in Edge Function')
        }

        const prompt = `Você é um Estrategista de Conteúdo sênior.
      OBJETIVO: Gerar uma estrutura de 4 semanas de conteúdo para Instagram.
      
      ESTRUTURA OBRIGATÓRIA DO JSON:
      Gere um objeto JSON com a chave "weeks" que contenha uma lista de 4 objetos (um para cada semana).
      Cada semana deve ter chaves numéricas de 0 a 6 (representando Domingo a Sábado).
      Exemplo de mapeamento: 0: Domingo, 1: Segunda, 2: Terça, 3: Quarta, 4: Quinta, 5: Sexta, 6: Sábado.
      
      REGRAS CRÍTICAS DE UNICIDADE E PROGRESSÃO:
      - OBRIGATÓRIO: Cada uma das 4 semanas DEVE ter um foco narrativo diferente (ex: Semana 1: Consciência, Semana 2: Educação, Semana 3: Autoridade, Semana 4: Venda/Oferta).
      - PROIBIDO: Repetir o mesmo título, tema ou roteiro em semanas diferentes.
      - A narrativa deve evoluir ao longo do mês.
      
      REGRAS CRÍTICAS DE FREQUÊNCIA:
      - Frequência: ${routine.routine_posts_per_week} posts por semana.
      - Dias de Postagem PERMITIDOS: ${routine.routine_posting_days?.join(", ")}.
      - Importante: Gere conteúdo APENAS para os dias listados em "Dias de Postagem".
      - Para os dias NÃO listados, retorne os objetos feed e stories vazios ou nulos.
      
      CONTEÚDO PARA CADA DIA ATIVO (JSON):
      - feed: { format, intention, headline, instruction, time, link, status: 'planned', notes: '' }
        IMPORTANTE: 'format' do feed DEVE ser EXATAMENTE um destes: Carrossel, Reels, Foto, Alternar.
        'time': Sugira um horário da lista de 'Horários de Postagem'.
        'link': Deixe vazio ou sugira um link de referência se houver contexto.
      - stories: { format, intention, headline, instruction, time, link, status: 'planned', notes: '' }
        IMPORTANTE: 'format' do stories DEVE ser EXATAMENTE um destes: Caixa, Diário, Sequência, Conversa.
        'time': Sugira um horário da lista de 'Horários de Postagem'.
      
      CONTEXTO DA MARCA:
      Nome: ${brand?.name}
      Setor: ${brand?.sector}
      DNA: ${brand?.dna_tese}
      Personalidade: ${brand?.result_essencia}
      Intenções Preferidas: ${JSON.stringify(routine.routine_intentions_prefs)}
      Formatos Preferidos: ${JSON.stringify(routine.routine_feed_format_prefs)}
      Horários de Postagem: ${JSON.stringify(routine.routine_fixed_hours)}
      
      Use tons de voz: ${brand?.user_tone_selected?.join(", ")}.
      As instruções devem ser curtas e diretas ao ponto.
      SAÍDA EXCLUSIVAMENTE EM JSON.`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Expert em branding e estratégia de conteúdo. Saída sempre em JSON com a chave 'weeks'." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            })
        })

        const data = await response.json()

        if (data.error) {
            throw new Error(`OpenAI API Error: ${data.error.message}`)
        }

        let result = JSON.parse(data.choices[0].message.content)

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
