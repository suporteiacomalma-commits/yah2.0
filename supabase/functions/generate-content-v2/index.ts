import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, brandId, postData, adjustment, apiKey: bodyApiKey } = await req.json()

        if (!action || !brandId) {
            throw new Error('Action and Brand ID are required')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // ALWAYS fetch fresh data from DB
        const { data: brand, error: brandError } = await supabaseClient
            .from('brands')
            .select('*')
            .eq('id', brandId)
            .single()

        if (brandError || !brand) {
            throw new Error(`Error fetching brand: ${brandError?.message || 'Brand not found'}`)
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY') || bodyApiKey
        if (!apiKey) {
            throw new Error('OpenAI API Key not configured')
        }

        const systemPrompt = montaSystemPrompt(brand)

        let userPrompt = ''
        let responseFormat = { type: "json_object" }

        if (action === 'generate_planning') {
            userPrompt = montaPlanningPrompt(brand)
        } else if (action === 'generate_script') {
            if (!postData) throw new Error('Post data is required for script generation')
            userPrompt = montaScriptPrompt(brand, postData, adjustment)
        } else if (action === 'generate_dna_subjects') {
            userPrompt = montaDNASubjectsPrompt(brand)
        } else {
            throw new Error('Invalid action')
        }

        const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: responseFormat,
                temperature: 0.7
            })
        })

        const data = await openAiResponse.json()
        if (data.error) throw new Error(`OpenAI Error: ${data.error.message}`)

        const content = data.choices[0].message.content
        const result = JSON.parse(content)

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

function montaSystemPrompt(brand: any) {
    const persona = brand.dna_persona_data || {}
    const essencia = brand.result_essencia || ''
    const tomVal = brand.result_tom_voz || ''
    const comoPensa = brand.result_como_funciona || ''

    return `
# IDENTIDADE
Nome: ${brand.name || 'Não definido'}
Essência: ${essencia}
Tom de voz: ${tomVal}
Perfil criativo: ${Array.isArray(brand.user_creative_profile) ? brand.user_creative_profile.join(", ") : ''}
Como pensa: ${comoPensa}
Objetivos: ${brand.user_motivation || ''} ${brand.user_change_world || ''}

# DNA DA MARCA
Tese: ${brand.dna_tese || ''}
Pilares e Assuntos Autorais:
${Array.isArray(brand.dna_pilares) ? brand.dna_pilares.map((p: any) => `- ${p.title}: ${p.description}`).join("\n") : ''}
Produto/serviço: ${brand.dna_produto || ''}

# PÚBLICO
Quem são: ${persona.name || ''} - ${persona.job || ''}
Dor principal: ${brand.dna_dor_principal || (persona.pains && persona.pains[0]) || ''}
Desejo principal: ${brand.dna_sonho_principal || persona.dream || ''}

# REGRAS DE VOZ
• escrever como a pessoa falando
• evitar linguagem genérica
• evitar clichês de marketing
• usar linguagem natural
• priorizar exemplos e conflitos reais
`
}

function montaPlanningPrompt(brand: any) {
    return `
# CONTEXTO
Frequência semanal: ${brand.routine_posts_per_week || 3}
Dias ativos: ${Array.isArray(brand.routine_posting_days) ? brand.routine_posting_days.join(", ") : ''}
Formato por dia: ${JSON.stringify(brand.routine_feed_format_prefs || {})}
Intenção por dia: ${JSON.stringify(brand.routine_intentions_prefs || {})}

---

# DNA DA MARCA
Tese da marca: ${brand.dna_tese || ''}
Pilares da marca: ${JSON.stringify(Array.isArray(brand.dna_pilares) ? brand.dna_pilares.map((p: any) => p.title) : [])}
Assuntos da marca: ${JSON.stringify(Array.isArray(brand.dna_pilares) ? brand.dna_pilares.map((p: any) => p.title) : [])}
Produto ou serviço principal: ${brand.dna_produto || ''}

# REGRAS DE VOZ
• Deve soar como essa pessoa específica falando
• Nunca usar linguagem genérica de marketing
• Nunca usar frases motivacionais vazias
• Prefira conflito real e exemplo concreto
• Use linguagem natural, humana e direta
• Não soar como copywriter genérico
• Não soar institucional demais
• Escreva como alguém que conhece profundamente a própria vivência

---

# TAREFA
Crie um planejamento de conteúdo para 4 semanas.
Para cada dia ativo gere:
• assunto usado
• tema
• título
• ângulo do post

REGRAS
• respeitar intenção do dia
• respeitar formato do dia
• usar os assuntos do DNA como base
• evitar temas amplos
• usar o conflito presente no assunto como motor do tema
• evitar repetir o mesmo assunto muitas vezes

PROGRESS_ÃO DAS SEMANAS
Semana 1 → revelar o problema
Semana 2 → explicar o problema
Semana 3 → apresentar nova visão
Semana 4 → mostrar solução ou método

Não gerar roteiro.
Não gerar legenda.

OUTPUT
JSON estruturado com a chave "weeks" contendo uma lista de 4 objetos (um para cada semana). 
Cada semana deve ter chaves numéricas de 0 a 6 (representando Domingo a Sábado). 
Somente gere conteúdo para os dias ativos.
Cada dia ativo deve ter o formato EXATO (sem acentos nas chaves): { "assunto_usado": "", "tema": "", "titulo": "", "angulo": "", "format": "", "intention": "" }
`
}

function montaScriptPrompt(brand: any, post: any, adjustment?: string) {
    let adjustmentSection = ''
    if (adjustment) {
        adjustmentSection = `
# AJUSTE SOLICITADO
O usuário deseja ajustar o conteúdo com a seguinte instrução: "${adjustment}"
Considere o contexto original, mas priorize este ajuste.
`
    }

    return `
# CONTEXTO DO POST
Dia: ${post.dia || ''}
Formato: ${post.formato || ''}
Intenção: ${post.intencao || ''}
Título (PRINCIPAL): ${post.titulo || ''}
Ângulo/Direcionamento: ${post.angulo || ''}
Pilar Base: ${post.pilar || ''}
${adjustmentSection}

# TAREFA CRÍTICA
Seu objetivo é escrever um conteúdo que expanda o "Título" de forma profunda e estratégica.
Não seja genérico. O conteúdo deve ser uma extensão direta do Título e do Ângulo fornecidos.
Use os detalhes da Identidade da Marca (Essência, Tom, Como Pensa, Tese) para dar uma voz única ao texto.

# DIRETRIZES DE PROFUNDIDADE
• ÂNCORA: Inicie e desenvolva o conteúdo sempre conectado com o TÍTULO.
• ESPECIFICIDADE: Use situações reais, exemplos práticos ou analogias únicas que apenas alguém com a experiência descrita no Brand DNA saberia falar.
• CONFLITO: Explore o problema ou a tensão presente no Ângulo do post. Por que isso importa? O que acontece se não for resolvido?
• AUTORALIDADE: Aplique a Tese da Marca em cada parágrafo. Não dê dicas que um Google daria. Dê a visão da MARCA.

# REGRAS DE FORMATO
• O campo "roteiro" deve ser uma STRING ÚNICA com quebras de linha (\n). Nunca retorne um objeto aninhado.
• Se REELS/VÍDEO: Detalhe as cenas, o que aparece na tela e a fala exata.
• Se CARROSSEL: Detalhe Slide a Slide (Título do slide + Descrição da imagem + Legenda do slide).

# REGRAS DE VOZ
• O conteúdo deve soar como uma pessoa real falando
• Nunca usar linguagem genérica de marketing (ex: "No post de hoje...", "Arraste para o lado")
• Nunca usar frases motivacionais vazias
• Usar linguagem natural, humana e específica
• Evitar clichês como: "Dica de ouro", "Segredo que ninguém conta", "Olá pessoal".

# ESCOLHA DA ESTRUTURA
Use apenas a estrutura correspondente à intenção recebida: ${post.intencao}.

# ESTRUTURA POR INTENÇÃO (OBRIGATÓRIO SEGUIR):

Identificação (O PÚBLICO SE RECONHECE):
- Gancho: Abordar uma dor, hábito ou situação comum que o público vive, diretamente ligada ao TÍTULO.
- Desenvolvimento: Explorar o "eu também passo por isso", criando o sentimento de "essa pessoa me entende". Use detalhes sensoriais e emocionais.
- CTA: Pergunta de identificação (ex: "Quem mais é assim?", "Você também já viveu isso?").

Educação (ENSINA ALGO QUE TRANSFORMA PERSPECTIVA):
- Gancho: Quebra de padrão ou promessa de uma solução/atalho vinda do TÍTULO.
- Desenvolvimento: Passo a passo claro ou uma nova forma de enxergar um problema. Conteúdo denso mas mastigado. Foco no "Como" e no "Porquê".
- CTA: Convite para salvar para consultar depois ou comentar uma dúvida.

Cultura (MOSTRA COMO A MARCA PENSA):
- Gancho: Uma opinião forte ou posicionamento sobre o TÍTULO.
- Desenvolvimento: O "porquê" por trás do que a marca faz. Diferenciação pelo pensamento e pelos valores inegociáveis.
- CTA: Pergunta reflexiva (ex: "O que você pensa sobre isso?", "Faz sentido pra você?").

Conexão (APROXIMA A PESSOA DO CRIADOR):
- Gancho: Um momento vulnerável ou bastidor real conectado ao TÍTULO.
- Desenvolvimento: Elementos de humanização. Mostra o lado humano além do profissional. Compartilhe um aprendizado pessoal.
- CTA: Convite para compartilhar uma experiência parecida.

Vendas Invisíveis (PRODUTO COMO SOLUÇÃO NATURAL):
- Gancho: Desejo aspiracional ou um problema que o produto resolve, vindo do TÍTULO.
- Desenvolvimento: Demonstração de uso ou transformação. O produto entra como coadjuvante da solução. Mostre o valor, não o preço.
- CTA: Direcionamento para link na bio ou direct.

Inspiração (MOVE, NÃO MOTIVA):
- Gancho: Uma conquista ou superação encorajadora ligada ao TÍTULO.
- Desenvolvimento: Storytelling curto que gera o desejo de mudança. Foco no "é possível pra você também".
- CTA: Frase de impacto ou convite para marcar alguém.

# ADAPTAÇÃO POR FORMATO (${post.formato}):
- Se REELS: Script de vídeo (Cena 1, Cena 2...) com indicações de texto na tela e fala.
- Se CARROSSEL: Dividido por SLIDES (Slide 1, Slide 2...).
- Se IMAGEM ESTÁTICA: Descrição da imagem + texto principal.
- Se SEQUÊNCIA (STORIES): Sequência de 5-8 stories com enquetes/links.

# OUTPUT
Responda apenas em JSON válido:
{
 "gancho": "",
 "roteiro": "",
 "legenda": "",
 "cta": "",
 "hashtags": [],
 "pilar_usado": ""
}
`
}

function montaDNASubjectsPrompt(brand: any) {
    return `
Você é um estrategista de conteúdo especializado em marcas pessoais.
Sua tarefa é analisar os dados de identidade da marca do usuário e gerar 5 assuntos iniciais para o DNA da marca.

# DADOS DA MARCA
Essência: ${brand.result_essencia || ''}
Motivação: ${brand.user_motivation || ''}
Mudança no mundo: ${brand.user_change_world || ''}
Tese: ${brand.dna_tese || ''}
Nicho: ${brand.dna_nicho || ''}
Produto: ${brand.dna_produto || ''}
Dor do público: ${brand.dna_dor_principal || ''}
Sonho do público: ${brand.dna_sonho_principal || ''}

# OBJETIVO
Gerar assuntos que sejam: específicos, autorais, conectados à experiência real da marca.
Cada assunto deve representar um território temático real, contendo um conflito, tensão ou crença a ser questionada.

# REGRAS
• NUNCA invente nicho ou público.
• EVITE palavras únicas ou títulos curtos.
• NUNCA gere assuntos de uma ou duas palavras.
• EVITE termos genéricos como "produtividade", "mindset", "marketing".
• Cada assunto deve conter pelo menos dois: público específico, problema real, situação concreta, conflito/tensão, crença questionada.

# TESTE DE QUALIDADE
"Só essa pessoa específica faria conteúdo sobre isso exatamente desse jeito?" Se não, reescreva.

# OUTPUT FORMAT (JSON)
{
  "assuntos": [
    {
      "assunto": "título do território temático",
      "angulos": [
        "ângulo 1 (ex: erro comum)",
        "ângulo 2 (ex: explicação)",
        "ângulo 3 (ex: comparação)",
        "ângulo 4 (ex: mito)"
      ]
    }
  ]
}
`
}
