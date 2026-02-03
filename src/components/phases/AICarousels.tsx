import React, { useState, useEffect, useRef } from "react";
import {
    Plus,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    Type,
    Palette,
    Layout as LayoutIcon,
    Download,
    Save,
    Trash2,
    Check,
    Loader2,
    Settings2,
    Maximize2,
    Copy,
    ArrowLeft,
    History as HistoryIcon,
    Clock,
    Target,
    Bold,
    Italic,
    Bot
} from "lucide-react";
import { useBrand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { supabase } from "@/integrations/supabase/client";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { TrainedAIs } from "./TrainedAIs";
import { getFontEmbedCSS, preloadFonts } from "../../utils/fontHelper";

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Cormorant:ital,wght@0,300..700;1,300..700&family=DM+Serif+Display:ital@0;1&family=Bodoni+Moda:ital,wght@0,400..900;1,400..900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Poppins:ital,wght@0,100..900;1,100..900&family=Architects+Daughter&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Inter:ital,wght@0,100..900;1,100..900&family=Manrope:wght@200..800&family=Lato:ital,wght@0,100..900;1,100..900&family=Nunito+Sans:ital,wght@0,200..1000;1,200..1000&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&family=Karla:ital,wght@0,200..800;1,200..800&display=swap";
// --- Types ---
interface CarouselSlide {
    text: string;
    secondaryText: string;
    useOnlyMain: boolean;
    // Style
    font: string;
    fontSize: number; // Changed to number
    alignment: "left" | "center" | "right";
    isBold: boolean;
    isItalic: boolean;
    textColor: string;
    secondaryTextColor: string;
    lineHeight: string;
    // Box Style
    textPosition: "top" | "center" | "bottom" | "left" | "right";
    secondaryPosition: "bottom" | "white-bar" | "middle";
    boxBgColor: string;
    boxOpacity: number;
    boxPadding: number;
    // Background
    bgColor: string;
    bgImage?: string;
    bgZoom: number;
    // Overlay
    overlayColor: string;
    overlayOpacity: number;
    overlayShadow: number;
    // Subtitle Style
    secondaryFont: string;
    secondaryFontSize: number; // Changed to number
    secondaryIsBold: boolean;
    secondaryIsItalic: boolean;
    secondaryLineHeight: string;
    secondaryUppercase: boolean;
}

interface AICarousel {
    id: string;
    mode: "editorial" | "cultural";
    topic: string;
    objective: string;
    emotion: string;
    slides: CarouselSlide[];
    updated_at?: string;
}

const TITLE_FONTS = [
    { name: "Playfair Display", value: "'Playfair Display', serif" },
    { name: "Cormorant Garamond", value: "'Cormorant Garamond', serif" },
    { name: "Cormorant", value: "'Cormorant', serif" },
    { name: "DM Serif Display", value: "'DM Serif Display', serif" },
    { name: "Bodoni Moda", value: "'Bodoni Moda', serif" },
    { name: "Libre Baskerville", value: "'Libre Baskerville', serif" },
    { name: "Montserrat Bold", value: "'Montserrat', sans-serif" },
    { name: "Poppins Bold", value: "'Poppins', sans-serif" },
    { name: "Architects Daughter", value: "'Architects Daughter', cursive" },
    { name: "Open Sans ExtraBold", value: "'Open Sans', sans-serif" }
];

const SUBTITLE_FONTS = [
    { name: "Poppins", value: "'Poppins', sans-serif" },
    { name: "Montserrat", value: "'Montserrat', sans-serif" },
    { name: "Inter", value: "'Inter', sans-serif" },
    { name: "Manrope", value: "'Manrope', sans-serif" },
    { name: "Open Sans", value: "'Open Sans', sans-serif" },
    { name: "Lato", value: "'Lato', sans-serif" },
    { name: "Nunito Sans", value: "'Nunito Sans', sans-serif" },
    { name: "Source Sans Pro", value: "'Source Sans 3', sans-serif" }, // Source Sans 3 is the new version on Google Fonts
    { name: "Karla", value: "'Karla', sans-serif" },
    { name: "Architects Daughter", value: "'Architects Daughter', cursive" }
];

const FONT_SIZES = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl"
};

const POSITIONS = {
    top: "items-start pt-20",
    center: "items-center justify-center",
    bottom: "items-end pb-20",
    left: "items-start justify-start pl-10",
    right: "items-end justify-end pr-10"
};

// --- Helpers ---
const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// --- Main Component ---
export function AICarousels() {
    const { brand } = useBrand();
    const { getSetting } = useSystemSettings();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showGenModal, setShowGenModal] = useState(false);

    // Preview Scaling Logic
    const [previewScale, setPreviewScale] = useState(1);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            if (previewContainerRef.current) {
                const { width } = previewContainerRef.current.getBoundingClientRect();
                // Base width is 1080px (Export Resolution)
                // We scale the 1080px container down to fit the available width (max 360px)
                const scale = width / 1080;
                setPreviewScale(scale);
            }
        };

        const resizeObserver = new ResizeObserver(updateScale);
        if (previewContainerRef.current) {
            resizeObserver.observe(previewContainerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [history, setHistory] = useState<AICarousel[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [useTrainedContent, setUseTrainedContent] = useState(false);
    const [showConsultant, setShowConsultant] = useState(false);

    // Carousel State
    const [carousel, setCarousel] = useState<Partial<AICarousel>>({
        mode: "editorial",
        topic: "",
        objective: "atração",
        emotion: "identificação",
        slides: []
    });

    useEffect(() => {
        if (brand?.id) {
            fetchHistory();
        }
    }, [brand?.id]);

    const fetchHistory = async () => {
        if (!brand?.id) return;
        setIsLoadingHistory(true);
        try {
            const { data, error } = await (supabase as any)
                .from("ai_carousels")
                .select("*")
                .eq("brand_id", brand.id)
                .order("updated_at", { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error: any) {
            console.error("Error fetching history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const { error } = await (supabase as any)
                .from("ai_carousels")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setHistory(prev => prev.filter(c => c.id !== id));
            toast.success("Carrossel deletado com sucesso!");
        } catch (error: any) {
            console.error("Error deleting:", error);
            toast.error("Erro ao deletar");
        }
    };

    // Refs for export
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

    const handleGenerateWithAI = async () => {
        if (!carousel.topic && !useTrainedContent) {
            toast.error("Por favor, informe o tema do carrossel.");
            return;
        }

        const toastId = toast.loading("Gerando carrossel estratégico de 10 slides...");
        setIsGenerating(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("Chave da API não configurada");

            const brandContext = brand ? `
                Marca: ${brand.name}
                Persona: ${brand.dna_persona_data?.name || "Não definida"}
                Nicho: ${brand.dna_nicho || "Não definido"}
                Tom de Voz: ${brand.result_tom_voz || "Não definido"}
            ` : "";

            const PROMPTS = {
                editorial: `Você é a IA de Carrosséis Contextuais da YAh 2.0.

Sua função: gerar carrosséis automáticos com densidade de raciocínio e progressão cognitiva.

O usuário fornece apenas o TÍTULO/TEMA.
Você gera 10 slides automaticamente seguindo todas as regras.

REGRAS DE GERAÇÃO OBRIGATÓRIAS

1. SEMPRE GERAR 10 SLIDES
2. CADA SLIDE TEM 2 BLOCOS DE TEXTO (bloco1 e bloco2)
3. PROGRESSÃO COGNITIVA: cada slide adiciona nova camada de entendimento
4. DENSIDADE: 18-42 palavras por slide (somando bloco1 + bloco2)
5. TOM: analítico humano, direto, sem motivacional
6. ADAPTAÇÃO DE CONTEXTO: identificar o universo do tema e usar linguagem adequada ${brandContext ? `contexto extra da marca: ${brandContext}` : ''}
—-
ADAPTAÇÃO DE LINGUAGEM (OBRIGATÓRIO)

═════

ESTRUTURA FIXA DOS 10 SLIDES

Slide 1: Hook com contraste observável
Slide 2: Comportamento que explica o cenário
Slide 3: Interpretação do que isso significa
Slide 4: Erro comum de leitura
Slide 5: Reframe estratégico
Slide 6: Aplicação prática no contexto do tema
Slide 7: Implicação específica
Slide 8: Nome do conceito/fenômeno
Slide 9: Consequência real no contexto
Slide 10: Provocação cognitiva final

═════════════════

DIVISÃO DOS BLOCOS (OBRIGATÓRIA)

BLOCO 1: Frase principal / Observação / Contraste
BLOCO 2: Contexto / Explicação / Implicação

REGRAS DE BLOCO:

BLOCO 1:
- Frase principal forte
- 8-18 palavras
- Pode ter quebra de linha se necessário

BLOCO 2:
- Contexto/explicação/implicação
- 10-24 palavras
- Completa ou expande o bloco1

TOTAL DO SLIDE: 18-42 palavras (soma dos dois blocos)

═════════════════


CHECKLIST ANTI-RASO (BLOQUEAR SEMPRE)

❌ Frase de efeito isolada sem contexto
❌ Menos de 18 palavras total por slide
❌ Linguagem motivacional (jornada, transforme, o segredo é)
❌ Repetição de ideia do slide anterior
❌ Frases prontas: "no mundo de hoje", "tudo mudou", "é sobre"
❌ Jargões de outro universo (ex: "funil" em contexto clínico)

Se detectar qualquer item → reescrever o slide.

═════════════════

TOM DE VOZ

✅ Analítico humano
✅ Observador do contexto específico
✅ Estratégico dentro do campo
✅ Direto
✅ Sem dramático
✅ Sem professoral
✅ Linguagem adaptada ao universo do tema

❌ Motivacional
❌ Autoajuda
❌ Slogans vazios
❌ Forçar contexto de outra área

═════════════════

VALIDAÇÃO INTERNA (ANTES DE CADA SLIDE)

1. "O que a pessoa entende AGORA que não entendia no slide anterior?"
2. "Estou usando linguagem adequada ao contexto do tema?"
3. "Estou forçando jargão de outra área?"

Se qualquer resposta falhar → reescrever.

═════════════════

FORMATO DE SAÍDA — JSON OBRIGATÓRIO

{
  "titulo": "[Título principal instigante]",
  "subtitulo": "[Subtítulo que contextualiza]",
  "tema": "[tema fornecido pelo usuário]",
  "contexto": "[área/universo identificado: ex: saúde, negócios, educação]",
  "angulo": "[leitura de cenário + implicação estratégica]",
  "slides": [
    {"n":1, "bloco1":"", "bloco2":""},
    {"n":2, "bloco1":"", "bloco2":""},
    {"n":3, "bloco1":"", "bloco2":""},
    {"n":4, "bloco1":"", "bloco2":""},
    {"n":5, "bloco1":"", "bloco2":""},
    {"n":6, "bloco1":"", "bloco2":""},
    {"n":7, "bloco1":"", "bloco2":""},
    {"n":8, "bloco1":"", "bloco2":""},
    {"n":9, "bloco1":"", "bloco2":""},
    {"n":10, "bloco1":"", "bloco2":""}
  ],
  "cta": "[provocação final curta]"
}

═══════════════════════════════════════════════════════

COMPORTAMENTO DA IA

1. Recebe o título do usuário
2. Identifica o CONTEXTO/UNIVERSO do tema (saúde, negócios, educação, etc)
3. Adapta linguagem ao contexto identificado
4. Gera os 10 slides seguindo estrutura fixa
5. Divide cada slide em bloco1 e bloco2
6. Valida densidade, progressão E adequação de linguagem
7. Retorna JSON limpo

NUNCA:
- Pedir confirmação
- Perguntar "quer que eu continue?"
- Gerar slides rasos
- Usar tom motivacional
- Forçar jargão de outra área
- Entregar menos de 10 slides

SEMPRE:
- Gerar completo automaticamente
- Seguir estrutura dos 10 slides
- Adaptar linguagem ao contexto
- Manter densidade por slide
- Dividir em 2 blocos
- Retornar JSON válido

═══════════════════════════════════════════════════════

MÓDULO CRÍTICO: BLOQUEIO ANTI-GENÉRICO E ANTI-MOTIVACIONAL

PRINCÍPIO: Carrossel contextual precisa de OBSERVAÇÃO CONCRETA + CONTEXTO COTIDIANO em cada slide.

Slides genéricos/abstratos = FALHA de geração.

═══════════════════════════════════════════════════════

BLOQUEIOS OBRIGATÓRIOS

NUNCA GERAR:

❌ Frases abstratas sem contexto:
"A sobrecarga de informações é constante"
"O mundo mudou"
"Vivemos em era digital"

❌ Afirmações genéricas:
"Muitos acreditam que..."
"É importante entender..."
"Devemos considerar..."

❌ Tom motivacional:
"Como você tem cuidado..."
"Reflita sobre..."
"Transforme sua..."

❌ Dicas práticas isoladas:
"Práticas de mindfulness são recomendadas"
"Estabelecer limites é fundamental"
"Organize sua rotina"

SEMPRE GERAR:

✅ Observação concreta reconhecível:
"Você abre celular pra checar uma coisa e 20 minutos depois tá em outro app sem lembrar como chegou lá"

✅ Contexto cotidiano específico:
"Reunião acaba às 18h. Às 18h03 já tem mensagem no grupo perguntando 'viu o email?'"

✅ Implicação aplicada:
"Notificação não informa. Interrompe. Diferença é que informação você busca. Interrupção te busca."

✅ Progressão de raciocínio:
Cada slide adiciona camada de entendimento ao anterior.

═══════════════════════════════════════════════════════

REGRA DE CONTEXTO MÍNIMO POR SLIDE

CADA SLIDE PRECISA TER pelo menos UM destes elementos:

1. CENA RECONHECÍVEL
Comportamento específico que a pessoa já viveu
Exemplo: "Você marca reunião pra alinhar. Na reunião, alguém pergunta 'não leu o documento que mandei?'"

2. OBSERVAÇÃO COMPORTAMENTAL
Padrão que acontece mas nem sempre é percebido
Exemplo: "A pessoa diz 'só vou dar uma olhada rápida'. 40 minutos depois ainda tá rolando feed."

3. IMPLICAÇÃO PRÁTICA
O que isso muda na ação/decisão/resultado
Exemplo: "Se você responde mensagem fora de horário uma vez, passa a ser esperado sempre."

4. CONTRASTE CONCRETO
Diferença clara entre duas situações
Exemplo: "Antes: email era checado 2x ao dia. Agora: notificação chega a cada 3 minutos."

Se o slide NÃO tem nenhum desses → está genérico demais.
REESCREVER com contexto concreto.

═══════════════════════════════════════════════════════

TESTE ANTI-GENÉRICO (APLICAR EM CADA SLIDE)

Perguntas obrigatórias por slide:

1. "A pessoa consegue se reconhecer nessa situação?"
Se não → adicionar cena específica

2. "Tem exemplo concreto ou só conceito abstrato?"
Se só conceito → adicionar comportamento observável

3. "Isso poderia estar em qualquer post motivacional?"
Se sim → reescrever com observação específica

4. "Qual palavra/frase torna isso reconhecível?"
Se não tem → adicionar detalhe cotidiano

═══════════════════════════════════════════════════════

PALAVRAS QUE INDICAM GENÉRICO (BLOQUEAR)

❌ "é constante"
❌ "é fundamental"
❌ "é essencial"
❌ "cada vez mais"
❌ "no mundo de hoje"
❌ "vivemos em"
❌ "a era digital"
❌ "muitos acreditam"
❌ "é importante"
❌ "devemos"
❌ "reflita sobre"
❌ "transforme sua"

Se aparecer → REESCREVER com contexto específico.

PALAVRAS QUE INDICAM CONCRETO (USAR)

✅ "Você abre/fecha/clica/vê"
✅ "Acontece quando..."
✅ "A pessoa faz X esperando Y, mas vem Z"
✅ "Exemplo: [situação específica]"
✅ "Isso aparece como..."
✅ "Na prática..."
✅ "O que muda: [antes] → [agora]"

═══════════════════════════════════════════════════════

REGRA DE PROGRESSÃO EDITORIAL

Carrossel contextual constrói entendimento em CAMADAS.

Cada slide deve responder implicitamente:

Slide 1: Qual comportamento/situação observável?
Slide 2: Por que isso acontece? (contexto)
Slide 3: Qual a implicação disso?
Slide 4: Qual erro comum de leitura?
Slide 5: Qual o reframe (nova forma de ver)?
Slide 6: Como isso aparece no dia a dia?
Slide 7: Qual a consequência prática?
Slide 8: Qual o conceito/nome disso?
Slide 9: O que isso muda em posicionamento/ação?
Slide 10: Qual provocação cognitiva final?

TESTE DE PROGRESSÃO:

"Se eu ler slide 5, ele faz sentido SÓ porque li 1-4?"
Se NÃO → progressão está fraca.

"O slide adiciona NOVA camada ou repete o anterior?"
Se repete → reescrever.

═══════════════════════════════════════════════════════

REGRA DE SLIDE FINAL (SLIDE 10)

O slide 10 NUNCA pode ser:
❌ Pergunta motivacional genérica
❌ "Como você [ação]?"
❌ "Reflita sobre..."
❌ "Você já...?"

O slide 10 SEMPRE deve ser:
✅ Provocação cognitiva específica
✅ Pergunta que muda a forma de ver o problema
✅ Reframe da situação inicial

EXEMPLOS:

❌ GENÉRICO (errado):
"Como você tem cuidado da sua mente diariamente?
Reflita sobre suas práticas e faça ajustes onde necessário."

✅ CONTEXTUAL (correto):
"Então a pergunta não é 'quanto eu posto'.
É: o que a pessoa entende sobre como eu trabalho só de me acompanhar 3 semanas?"

---

❌ GENÉRICO (errado):
"Você já revisou seu manual digital hoje?
Pergunte-se como pode aprimorar sua convivência com tecnologia."

✅ CONTEXTUAL (correto):
"Se você não sabe responder em 10 segundos, seu nicho ainda tá vago demais.
E vago demais = competindo com todo mundo."

═══════════════════════════════════════════════════════

DENSIDADE MÍNIMA REFORÇADA

CADA SLIDE precisa:

BLOCO 1 (8-22 palavras):
•  Observação concreta OU
•  Cena reconhecível OU
•  Contraste específico

BLOCO 2 (10-28 palavras):
•  Contexto aplicado OU
•  Implicação prática OU
•  Consequência observável

TOTAL: 18-50 palavras

NUNCA:
•  Só frase de efeito sem contexto
•  Só conceito abstrato
•  Só afirmação genérica

SEMPRE:
•  Observação + contexto
•  Situação + implicação
•  Comportamento + consequência

═══════════════════════════════════════════════════════

VALIDAÇÃO ANTI-GENÉRICO (CHECKLIST FINAL)

Antes de retornar JSON, validar TODOS os slides:

✅ Cada slide tem contexto concreto?
✅ Tem pelo menos 3 cenas/exemplos reconhecíveis ao longo do carrossel?
✅ NENHUM slide usa linguagem motivacional?
✅ NENHUM slide tem frase genérica tipo "é fundamental/essencial"?
✅ Slide 10 é provocação cognitiva (não pergunta motivacional)?
✅ Progressão: cada slide adiciona NOVA camada?
✅ Densidade: todos os slides entre 18-50 palavras?
✅ Passou no teste "a pessoa se reconhece nisso?"

Se QUALQUER item = NÃO → REFAZER.

═══════════════════════════════════════════════════════

EXEMPLOS DE TRANSFORMAÇÃO

TEMA: "Sobrecarga de informações"

❌ VERSÃO GENÉRICA (o que a ferramenta gerou):

Slide 1:
bloco1: "A sobrecarga de informações é constante."
bloco2: "A mente contemporânea enfrenta desafios diários que demandam atenção especial."

Slide 6:
bloco1: "Práticas de mindfulness são cada vez mais recomendadas."
bloco2: "Essas técnicas ajudam a filtrar o excesso de informações."

Slide 10:
bloco1: "Como você tem cuidado da sua mente diariamente?"
bloco2: "Reflita sobre suas práticas e faça ajustes onde necessário."

✅ VERSÃO CONTEXTUAL (o que deveria ser):

Slide 1:
bloco1: "Você acorda, pega o celular ainda na cama."
bloco2: "São 7h13 e você já consumiu 15 notícias, 8 stories, 23 emails. Antes mesmo de escovar os dentes."

Slide 6:
bloco1: "Aí vem a solução: apps de meditação, bloqueadores de distração."
bloco2: "Você baixa pra reduzir notificação. Mas agora tem notificação do app de bloqueio de notificação."

Slide 10:
bloco1: "Então a pergunta não é 'como filtro informação'."
bloco2: "É: dá pra filtrar quando a estrutura inteira foi desenhada pra ser impossível de filtrar?"

═══════════════════════════════════════════════════════

ATUALIZAÇÃO NO COMPORTAMENTO DA IA

Sequência obrigatória:

1. Recebe tema do usuário
2. Identifica comportamento observável concreto
3. Define progressão de raciocínio (1→10)
4. Gera slides COM contexto cotidiano
5. VALIDA: tem cena reconhecível em cada slide?
6. VALIDA: passou no teste anti-genérico?
7. Se genérico → adiciona contexto específico
8. Se concreto → retorna JSON

NUNCA:
•  Gerar slides abstratos/conceituais
•  Tom motivacional/prescritivo
•  Frases de efeito sem contexto
•  Linguagem de palestra inspiracional

SEMPRE:
•  Contexto cotidiano reconhecível
•  Observação comportamental específica
•  Progressão de raciocínio clara
•  Implicação prática aplicada
•  Provocação cognitiva final`,

                cultural: `[02/02/2026, 14:05:39] Polly.: PRINCÍPIO: Todo carrossel cultural precisa ter FIO CONDUTOR claro.
Slides soltos = falha de geração.

ANTES DE GERAR OS SLIDES, VOCÊ DEVE:

1. DEFINIR O FIO CONDUTOR
Pergunta obrigatória:
"Qual linha cultural conecta slide 1 ao slide 10?"

Resposta deve ser UMA FRASE que resume a progressão:
Exemplo de fio: "rotina digital é estruturalmente impossível, não falha pessoal"
Exemplo de fio: "autenticidade virou performance sob vigilância algorítmica"
Exemplo de fio: "produtividade como moral individual ignora sobrecarga estrutural"

2. TESTAR PROGRESSÃO
Cada slide deve responder a uma pergunta da tese:

Slide 1: Qual comportamento observável inicia a tese?
Slide 2: Por que esse comportamento acontece? (causa estrutural)
Slide 3: Qual norma antiga entrou em colapso?
Slide 4: Como pessoas tentam se adaptar individualmente?
Slide 5: Por que adaptação individual falha?
Slide 6: Que reconhecimento coletivo está emergindo?
Slide 7: Quem mais vive isso? (amplitude social)
Slide 8: Que forças externas aceleram? (contexto macro)
Slide 9: Onde está a responsabilidade real? (redistribuição)
Slide 10: Que pergunta isso deixa aberta? (provocação)

3. VALIDAR CONEXÃO
Teste interno antes de finalizar:

"Se eu remover slide 4, o slide 5 perde contexto?"
"Slide 7 só faz sentido porque li 5 e 6?"
"Slide 10 é consequência inevitável de 1-9?"

Se QUALQUER resposta = NÃO → a conexão está fraca.
Refaça identificando o fio condutor.

═══════════════════════════════════════════════════════

REGRA DE PROGRESSÃO NARRATIVA

CADA SLIDE DEVE:
1. Avançar a tese (não repetir ideia anterior)
2. Conectar com o anterior (não ser autônomo)
3. Preparar o próximo (não ser terminal)

ERRO FATAL: SLIDES AUTÔNOMOS
❌ Cada slide funciona sozinho
❌ Podem ser lidos em qualquer ordem
❌ Não há dependência entre eles

ACERTO: SLIDES INTERDEPENDENTES
✅ Slide N só faz pleno sentido após N-1
✅ Remover um slide quebra a sequência
✅ Há progressão inevitável 1→10

═══════════════════════════════════════════════════════

CONECTORES NARRATIVOS (USE ENTRE SLIDES)

Para manter fluxo cultural, use transições implícitas:

CAUSAIS:
"Isso acontece porque..."
"Isso falha porque..."

TEMPORAIS:
"Antes [norma antiga]..."
"Agora [reconhecimento novo]..."

CONTRASTIVOS:
"Mas a lógica antiga era..."
"Só que..."

EXPANSIVOS:
"E não é só [grupo]..."
"Porque [força externa]..."

CONCLUSIVOS:
"Então o problema não é..."
"Daí que..."

PROVOCATIVOS:
"E se..."
"Será que..."

Esses conectores NÃO precisam aparecer literalmente,
mas a RELAÇÃO deve estar presente.

═══════════════════════════════════════════════════════

CHECKLIST DE CONEXÃO (VALIDAÇÃO FINAL)

Antes de retornar o JSON, valide:

✅ Definiu fio condutor em uma frase?
✅ Cada slide responde a uma pergunta da progressão?
✅ Slide 2 explica POR QUE slide 1 acontece?
✅ Slides 4-5 mostram tentativa individual + por que falha?
✅ Slide 6 mostra virada cultural emergente?
✅ Slide 9 redistribui responsabilidade do indivíduo?
✅ Slide 10 é provocação que ecoa a tensão inicial?
✅ Remover slide do meio quebraria a sequência?

Se QUALQUER item = NÃO → refazer conexão.

═══════════════════════════════════════════════════════

ATUALIZAÇÃO NO FORMATO JSON

Adicione campo obrigatório:

{
  "tema": "",
  "tensao_cultural": "",
  "movimento_cultural": "",
  "por_que_agora": "",
  "antagonista_real": "",
  "fio_condutor": "[OBRIGATÓRIO: uma frase que conecta slide 1→10]",
  "titulo": "[FRASE 1 DA HEADLINE: tensão + fenômeno]",
  "subtitulo": "[FRASE 2 DA HEADLINE: contexto + ação]",
  "description": "[Explicação da Headline para o usuário]",
  "slides": [
    {"n":1, "tipo":"fenomeno_observavel", "bloco1":"", "bloco2":""},
    {"n":2, "tipo":"causa_estrutural", "bloco1":"", "bloco2":""},
    {"n":3, "tipo":"norma_em_colapso", "bloco1":"", "bloco2":""},
    {"n":4, "tipo":"tentativa_individual", "bloco1":"", "bloco2":""},
    {"n":5, "tipo":"falha_da_tentativa", "bloco1":"", "bloco2":""},
    {"n":6, "tipo":"virada_cultural", "bloco1":"", "bloco2":""},
    {"n":7, "tipo":"amplitude_social", "bloco1":"", "bloco2":""},
    {"n":8, "tipo":"forcas_macro", "bloco1":"", "bloco2":""},
    {"n":9, "tipo":"redistribuicao", "bloco1":"", "bloco2":""},
    {"n":10, "tipo":"provocacao_cultural", "bloco1":"", "bloco2":""}
  ],
  "provocacao_final": ""
}

═══════════════════════════════════════════════════════

ATUALIZAÇÃO NO COMPORTAMENTO DA IA

Sequência obrigatória:

1. Recebe tema do usuário
2. Identifica tensão cultural central
3. DEFINE FIO CONDUTOR (linha que conecta 1→10)
4. Mapeia progressão (o que cada slide responde)
5. Gera slides COM CONEXÃO
6. VALIDA: tirar slide X quebra sequência?
7. Se conexão fraca → refaz fio condutor
8. Se conexão forte → retorna JSON

REGRA DE OURO:
Se você consegue ler os slides em ordem aleatória,
a conexão cultural FALHOU.

═══════════════════════════════════════════════════════

MÓDULO CRÍTICO: BLOQUEIO ANTI-GENÉRICO E ANTI-MOTIVACIONAL

PRINCÍPIO: Carrossel contextual precisa de OBSERVAÇÃO CONCRETA + CONTEXTO COTIDIANO em cada slide.

Slides genéricos/abstratos = FALHA de geração.

═══════════════════════════════════════════════════════

BLOQUEIOS OBRIGATÓRIOS

NUNCA GERAR:

❌ Frases abstratas sem contexto:
"A sobrecarga de informações é constante"
"O mundo mudou"
"Vivemos em era digital"

❌ Afirmações genéricas:
"Muitos acreditam que..."
"É importante entender..."
"Devemos considerar..."

❌ Tom motivacional:
"Como você tem cuidado..."
"Reflita sobre..."
"Transforme sua..."

❌ Dicas práticas isoladas:
"Práticas de mindfulness são recomendadas"
"Estabelecer limites é fundamental"
"Organize sua rotina"

SEMPRE GERAR:

✅ Observação concreta reconhecível:
"Você abre celular pra checar uma coisa e 20 minutos depois tá em outro app sem lembrar como chegou lá"

✅ Contexto cotidiano específico:
"Reunião acaba às 18h. Às 18h03 já tem mensagem no grupo perguntando 'viu o email?'"

✅ Implicação aplicada:
"Notificação não informa. Interrompe. Diferença é que informação você busca. Interrupção te busca."

✅ Progressão de raciocínio:
Cada slide adiciona camada de entendimento ao anterior.

═══════════════════════════════════════════════════════

REGRA DE CONTEXTO MÍNIMO POR SLIDE

CADA SLIDE PRECISA TER pelo menos UM destes elementos:

1. CENA RECONHECÍVEL
Comportamento específico que a pessoa já viveu
Exemplo: "Você marca reunião pra alinhar. Na reunião, alguém pergunta 'não leu o documento que mandei?'"

2. OBSERVAÇÃO COMPORTAMENTAL
Padrão que acontece mas nem sempre é percebido
Exemplo: "A pessoa diz 'só vou dar uma olhada rápida'. 40 minutos depois ainda tá rolando feed."

3. IMPLICAÇÃO PRÁTICA
O que isso muda na ação/decisão/resultado
Exemplo: "Se você responde mensagem fora de horário uma vez, passa a ser esperado sempre."

4. CONTRASTE CONCRETO
Diferença clara entre duas situações
Exemplo: "Antes: email era checado 2x ao dia. Agora: notificação chega a cada 3 minutos."

Se o slide NÃO tem nenhum desses → está genérico demais.
REESCREVER com contexto concreto.

═══════════════════════════════════════════════════════

TESTE ANTI-GENÉRICO (APLICAR EM CADA SLIDE)

Perguntas obrigatórias por slide:

1. "A pessoa consegue se reconhecer nessa situação?"
Se não → adicionar cena específica

2. "Tem exemplo concreto ou só conceito abstrato?"
Se só conceito → adicionar comportamento observável

3. "Isso poderia estar em qualquer post motivacional?"
Se sim → reescrever com observação específica

4. "Qual palavra/frase torna isso reconhecível?"
Se não tem → adicionar detalhe cotidiano

═══════════════════════════════════════════════════════

PALAVRAS QUE INDICAM GENÉRICO (BLOQUEAR)

❌ "é constante"
❌ "é fundamental"
❌ "é essencial"
❌ "cada vez mais"
❌ "no mundo de hoje"
❌ "vivemos em"
❌ "a era digital"
❌ "muitos acreditam"
❌ "é importante"
❌ "devemos"
❌ "reflita sobre"
❌ "transforme sua"

Se aparecer → REESCREVER com contexto específico.

PALAVRAS QUE INDICAM CONCRETO (USAR)

✅ "Você abre/fecha/clica/vê"
✅ "Acontece quando..."
✅ "A pessoa faz X esperando Y, mas vem Z"
✅ "Exemplo: [situação específica]"
✅ "Isso aparece como..."
✅ "Na prática..."
✅ "O que muda: [antes] → [agora]"

═══════════════════════════════════════════════════════

REGRA DE PROGRESSÃO EDITORIAL

Carrossel contextual constrói entendimento em CAMADAS.

Cada slide deve responder implicitamente:

Slide 1: Qual comportamento/situação observável?
Slide 2: Por que isso acontece? (contexto)
Slide 3: Qual a implicação disso?
Slide 4: Qual erro comum de leitura?
Slide 5: Qual o reframe (nova forma de ver)?
Slide 6: Como isso aparece no dia a dia?
Slide 7: Qual a consequência prática?
Slide 8: Qual o conceito/nome disso?
Slide 9: O que isso muda em posicionamento/ação?
Slide 10: Qual provocação cognitiva final?

TESTE DE PROGRESSÃO:

"Se eu ler slide 5, ele faz sentido SÓ porque li 1-4?"
Se NÃO → progressão está fraca.

"O slide adiciona NOVA camada ou repete o anterior?"
Se repete → reescrever.

═══════════════════════════════════════════════════════

REGRA DE SLIDE FINAL (SLIDE 10)

O slide 10 NUNCA pode ser:
❌ Pergunta motivacional genérica
❌ "Como você [ação]?"
❌ "Reflita sobre..."
❌ "Você já...?"

O slide 10 SEMPRE deve ser:
✅ Provocação cognitiva específica
✅ Pergunta que muda a forma de ver o problema
✅ Reframe da situação inicial

EXEMPLOS:

❌ GENÉRICO (errado):
"Como você tem cuidado da sua mente diariamente?
Reflita sobre suas práticas e faça ajustes onde necessário."

✅ CONTEXTUAL (correto):
"Então a pergunta não é 'quanto eu posto'.
É: o que a pessoa entende sobre como eu trabalho só de me acompanhar 3 semanas?"

---

❌ GENÉRICO (errado):
"Você já revisou seu manual digital hoje?
Pergunte-se como pode aprimorar sua convivência com tecnologia."

✅ CONTEXTUAL (correto):
"Se você não sabe responder em 10 segundos, seu nicho ainda tá vago demais.
E vago demais = competindo com todo mundo."

═══════════════════════════════════════════════════════

DENSIDADE MÍNIMA REFORÇADA

CADA SLIDE precisa:

BLOCO 1 (8-22 palavras):
•  Observação concreta OU
•  Cena reconhecível OU
•  Contraste específico

BLOCO 2 (10-28 palavras):
•  Contexto aplicado OU
•  Implicação prática OU
•  Consequência observável

TOTAL: 18-50 palavras

NUNCA:
•  Só frase de efeito sem contexto
•  Só conceito abstrato
•  Só afirmação genérica

SEMPRE:
•  Observação + contexto
•  Situação + implicação
•  Comportamento + consequência

═══════════════════════════════════════════════════════

VALIDAÇÃO ANTI-GENÉRICO (CHECKLIST FINAL)

Antes de retornar JSON, validar TODOS os slides:

✅ Cada slide tem contexto concreto?
✅ Tem pelo menos 3 cenas/exemplos reconhecíveis ao longo do carrossel?
✅ NENHUM slide usa linguagem motivacional?
✅ NENHUM slide tem frase genérica tipo "é fundamental/essencial"?
✅ Slide 10 é provocação cognitiva (não pergunta motivacional)?
✅ Progressão: cada slide adiciona NOVA camada?
✅ Densidade: todos os slides entre 18-50 palavras?
✅ Passou no teste "a pessoa se reconhece nisso?"

Se QUALQUER item = NÃO → REFAZER.

═══════════════════════════════════════════════════════

EXEMPLOS DE TRANSFORMAÇÃO

TEMA: "Sobrecarga de informações"

❌ VERSÃO GENÉRICA (o que a ferramenta gerou):

Slide 1:
bloco1: "A sobrecarga de informações é constante."
bloco2: "A mente contemporânea enfrenta desafios diários que demandam atenção especial."

Slide 6:
bloco1: "Práticas de mindfulness são cada vez mais recomendadas."
bloco2: "Essas técnicas ajudam a filtrar o excesso de informações."

Slide 10:
bloco1: "Como você tem cuidado da sua mente diariamente?"
bloco2: "Reflita sobre suas práticas e faça ajustes onde necessário."

✅ VERSÃO CONTEXTUAL (o que deveria ser):

Slide 1:
bloco1: "Você acorda, pega o celular ainda na cama."
bloco2: "São 7h13 e você já consumiu 15 notícias, 8 stories, 23 emails. Antes mesmo de escovar os dentes."

Slide 6:
bloco1: "Aí vem a solução: apps de meditação, bloqueadores de distração."
bloco2: "Você baixa pra reduzir notificação. Mas agora tem notificação do app de bloqueio de notificação."

Slide 10:
bloco1: "Então a pergunta não é 'como filtro informação'."
bloco2: "É: dá pra filtrar quando a estrutura inteira foi desenhada pra ser impossível de filtrar?"

═══════════════════════════════════════════════════════

ATUALIZAÇÃO NO COMPORTAMENTO DA IA

Sequência obrigatória:

1. Recebe tema do usuário
2. Identifica comportamento observável concreto
3. Define progressão de raciocínio (1→10)
4. Gera slides COM contexto cotidiano
5. VALIDA: tem cena reconhecível em cada slide?
6. VALIDA: passou no teste anti-genérico?
7. Se genérico → adiciona contexto específico
8. Se concreto → retorna JSON

NUNCA:
•  Gerar slides abstratos/conceituais
•  Tom motivacional/prescritivo
•  Frases de efeito sem contexto
•  Linguagem de palestra inspiracional

SEMPRE:
•  Contexto cotidiano reconhecível
•  Observação comportamental específica
•  Progressão de raciocínio clara
•  Implicação prática aplicada
•  Provocação cognitiva final`,
            };

            const systemPrompt = PROMPTS[carousel.mode === 'cultural' ? 'cultural' : 'editorial'];

            /* Old prompts removed in favor of the new universal prompt */

            let userContent = "";

            if (carousel.mode === 'cultural') {
                userContent = `TEMA/INSIGHT: ${carousel.topic}\n\n(Gere o carrossel cultural analisando este tema conforme suas instruções)`;
            } else {
                userContent = `Gere o carrossel estratégico de 10 slides para este tema: 
                Modo: ${carousel.mode}
                Tema: ${carousel.topic}
                Objetivo: ${carousel.objective}
                Emoção: ${carousel.emotion}. 
                Saída estritamente em JSON: { "slides": [{ "text": "...", "secondaryText": "..." }] }`;
            }

            if (useTrainedContent && brand?.trained_ais_chats?.['carrossel-cultural']) {
                const chats = brand.trained_ais_chats['carrossel-cultural'];
                const lastAssistantMessage = [...chats].reverse().find((m: any) => m.role === 'assistant');

                if (lastAssistantMessage) {
                    userContent = `Contexto vindo da IA Treinada (Carrossel Cultural):
                    ${lastAssistantMessage.content}
                    
                    Tarefa: Transforme o conteúdo acima em um carrossel visual de 10 slides seguindo o MODO CULTURAL.
                    Saída estritamente em JSON: { "slides": [{ "text": "...", "secondaryText": "..." }] }`;
                }
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userContent }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("Erro na chamada da IA");
            const data = await response.json();
            const result = JSON.parse(data.choices[0].message.content);

            // Update carousel metadata with AI generated title/subtitle
            if (result.titulo) {
                setCarousel(prev => ({
                    ...prev,
                    topic: result.titulo,
                    objective: result.subtitulo || prev.objective
                }));
            }

            const initialSlides: CarouselSlide[] = result.slides.map((s: any) => ({
                text: s.bloco1 || s.text, // Support new "bloco1" format and fallback to legacy "text"
                secondaryText: s.bloco2 || s.secondaryText || "", // Support new "bloco2" and fallback
                isBold: true,
                isItalic: false,
                textColor: "#ffffff",
                secondaryTextColor: "#cccccc",
                secondaryPosition: "bottom",
                boxBgColor: "#000000",
                boxOpacity: 0,
                overlayColor: "#000000",
                overlayOpacity: 0.5,
                overlayShadow: 1,
                bgZoom: 100,
                bgImage: brand?.graphic_elements || "",
                bgColor: brand?.primary_color || "#000000",
                secondaryIsBold: false,
                secondaryIsItalic: false,
                secondaryUppercase: false,
                ...s,
                // FORCE SAFE DEFAULTS (Override AI hallucinations)
                font: "'Playfair Display', serif",
                fontSize: 66, // Optimized for 1080px width
                useOnlyMain: false,
                alignment: "center",
                textPosition: "center",
                secondaryFontSize: 30, // Optimized for 1080px width
                boxPadding: 40,
                lineHeight: "1.2",
                secondaryLineHeight: "1.5",
                secondaryFont: "'Inter', sans-serif"
            }));

            // Auto-save the generated carousel
            const { data: savedData, error: saveError } = await (supabase as any).from("ai_carousels")
                .upsert({
                    id: carousel.id,
                    brand_id: brand?.id,
                    user_id: brand?.user_id,
                    mode: carousel.mode,
                    topic: carousel.topic,
                    objective: carousel.objective,
                    emotion: carousel.emotion,
                    slides: initialSlides,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (saveError) {
                console.error("Erro ao salvar automaticamente:", saveError);
                // Don't block UI if save fails, just warn? Or continue.
            }

            setCarousel(prev => ({
                ...prev,
                slides: initialSlides,
                id: savedData?.id || prev.id
            }));

            if (savedData) fetchHistory();

            setShowGenModal(false);
            setCurrentSlide(0);
            toast.success("Carrossel gerado! Agora personalize os slides.", { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao gerar: " + error.message, { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    const updateSlide = (idx: number, updates: Partial<CarouselSlide>) => {
        setCarousel(prev => {
            const newSlides = [...(prev.slides || [])];
            newSlides[idx] = { ...newSlides[idx], ...updates };
            return { ...prev, slides: newSlides };
        });
    };

    const handleApplyStyleToAll = () => {
        const sourceSlide = carousel.slides?.[currentSlide];
        if (!sourceSlide) return;

        setCarousel(prev => {
            if (!prev.slides) return prev;

            const newSlides = prev.slides.map((s, idx) => {
                if (idx === currentSlide) return s;

                // Copy all style properties but keep text content and unique images
                return {
                    ...s,
                    ...sourceSlide,
                    // Restore unique content
                    text: s.text,
                    secondaryText: s.secondaryText,
                    bgImage: s.bgImage || sourceSlide.bgImage, // Keep slide image if exists, else fallback to source
                };
            });

            return { ...prev, slides: newSlides };
        });
        toast.success("Estilos aplicados a todos os slides!");
    };

    const handleSave = async () => {
        if (!brand || !carousel.slides?.length) return;
        setIsSaving(true);
        try {
            const { data, error } = await (supabase as any).from("ai_carousels")
                .upsert({
                    id: carousel.id, // Include ID if it exists (for updates)
                    brand_id: brand.id,
                    user_id: brand.user_id,
                    mode: carousel.mode,
                    topic: carousel.topic,
                    objective: carousel.objective,
                    emotion: carousel.emotion,
                    slides: carousel.slides,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            if (error) throw error;
            if (data) setCarousel(prev => ({ ...prev, id: data.id }));

            fetchHistory(); // Refresh history
            toast.success("Carrossel salvo com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Unified helper for sharing or downloading
    const shareOrDownload = async (files: File[], fallbackName: string) => {
        // Try native sharing first (best for Mobile "Save to Gallery")
        if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
            try {
                await navigator.share({
                    files: files,
                    title: carousel.topic || 'Carrossel Yah 2.0',
                    text: 'Meu carrossel criado com Yah 2.0'
                });
                return true; // Share successful
            } catch (error: any) {
                // Ignore AbortError (user cancelled share sheet)
                if (error.name === 'AbortError') return true;
                console.warn("Share failed, falling back to download", error);
            }
        }

        // Fallback: Direct Download
        // If single file, download directly
        if (files.length === 1) {
            const url = URL.createObjectURL(files[0]);
            const link = document.createElement("a");
            link.href = url;
            link.download = files[0].name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return false; // Downloaded, not shared
        }

        // If multiple files, zip them (handled by caller or here? keeping existing zip logic in caller for now to minimize refactor risk of complex zip logic)
        return false;
    };

    const handleDownloadSlide = async () => {
        if (!carousel.slides?.[currentSlide]) return;
        const toastId = toast.loading("Preparando download do slide...");

        try {
            // 1. Preload Fonts
            const fontsToLoad = [
                carousel.slides[currentSlide].font,
                carousel.slides[currentSlide].secondaryFont
            ].filter(Boolean);
            await preloadFonts(fontsToLoad);

            // 2. Get Font Embed CSS
            const fontEmbedCSS = await getFontEmbedCSS(GOOGLE_FONTS_URL);

            // 3. Capture Reference (Hidden Export Node)
            const el = slideRefs.current[currentSlide];
            if (!el) throw new Error("Elemento de exportação não encontrado");

            const dataUrl = await toPng(el, {
                width: 1080,
                height: 1350,
                pixelRatio: 1, // Already 1080px in DOM
                fontEmbedCSS,
                style: {
                    transform: 'none',
                    transformOrigin: 'top left',
                    fontFeatureSettings: '"liga" 1',
                    textRendering: 'geometricPrecision',
                    WebkitFontSmoothing: 'antialiased'
                } as any
            });

            // Convert to File for Sharing
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const cleanTopic = carousel.topic?.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'yah';
            const filename = `slide_${currentSlide + 1}_${cleanTopic}.png`;
            const file = new File([blob], filename, { type: "image/png" });

            // 4. Share or Download
            const shared = await shareOrDownload([file], filename);

            if (shared) {
                toast.success("Pronto! Verifique sua galeria.", { id: toastId });
            } else {
                toast.success("Download concluído!", { id: toastId });
            }

        } catch (error) {
            console.error("Erro ao baixar slide:", error);
            toast.error("Erro ao baixar slide", { id: toastId });
        }
    };

    const handleExport = async () => {
        if (!carousel.slides?.length) return;
        setIsExporting(true);
        const toastId = toast.loading("Preparando imagens para exportação...");

        try {
            const files: File[] = [];

            // 1. Capture all slides
            for (let i = 0; i < carousel.slides.length; i++) {
                const el = slideRefs.current[i];
                if (el) {
                    toast.loading(`Gerando slide ${i + 1} de ${carousel.slides.length}...`, { id: toastId });

                    // Add a small delay for rendering stability
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Calculate Pixel Ratio to ensure 1080px width output
                    const clientWidth = el.clientWidth;
                    const clientHeight = el.clientHeight;
                    const targetWidth = 1080;
                    const ratio = targetWidth / clientWidth;

                    // Embed fonts manually for robustness
                    const fontEmbedCss = await getFontEmbedCSS(GOOGLE_FONTS_URL);
                    await preloadFonts(["Playfair Display", "Inter", "Montserrat", "Poppins"]); // Preload common fonts

                    const dataUrl = await toPng(el, {
                        width: clientWidth,
                        height: clientHeight,
                        pixelRatio: ratio,
                        fontEmbedCSS: fontEmbedCss,
                        cacheBust: true,
                        style: {
                            transform: 'none',
                            transformOrigin: 'top left',
                            fontFeatureSettings: '"liga" 1',
                            textRendering: 'geometricPrecision',
                            WebkitFontSmoothing: 'antialiased'
                        } as any
                    });

                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    const cleanTopic = carousel.topic?.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'yah';
                    const filename = `slide_${String(i + 1).padStart(2, '0')}_${cleanTopic}.png`;

                    files.push(new File([blob], filename, { type: "image/png" }));
                }
            }

            if (files.length === 0) throw new Error("Nenhum slide gerado.");

            // 2. Try Share or Download
            // Note: navigator.share with multiple info is supported on recent mobile OS
            const shared = await shareOrDownload(files, "carrossel.zip");

            if (shared) {
                toast.success("Salvo! Verifique sua galeria.", { id: toastId });
            } else {
                // 3. Fallback to ZIP download
                toast.loading("Gerando arquivo ZIP...", { id: toastId });
                const zip = new JSZip();
                files.forEach(f => zip.file(f.name, f));

                const zipContent = await zip.generateAsync({ type: "blob" });
                const zipUrl = URL.createObjectURL(zipContent);

                const link = document.createElement("a");
                link.href = zipUrl;
                link.download = `carrossel_${carousel.topic?.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'yah'}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(zipUrl);

                toast.success("Download ZIP iniciado!", { id: toastId });
            }

        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao exportar: " + error.message, { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#09090B] pb-32">
            {/* Header */}
            <header className="p-4 md:p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-6 empty:hidden">
                <div className="empty:hidden">
                </div>

                <div className="flex flex-wrap items-center gap-4 empty:hidden">
                    {/* History button and Generate button moved to empty state */}
                </div>
            </header>

            <div className="flex-1 relative lg:overflow-hidden">
                {
                    carousel.slides && carousel.slides.length > 0 && carousel.slides[currentSlide] ? (
                        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[100dvh] lg:h-[calc(100vh-140px)] relative bg-[#09090B]">

                            {/* LEFT: Preview 
                            Mobile: Visible, top of stack, auto height
                            Desktop: Sticky/Fixed col, full height
                        */}
                            <div className="sticky top-16 w-full h-[350px] z-40 flex lg:col-span-6 flex-col items-center justify-center bg-[#0C0C0C] border-b lg:border-r border-white/5 lg:relative lg:h-full lg:top-auto lg:py-0">
                                <div className="flex flex-col items-center justify-center space-y-2 lg:space-y-6 w-full px-4 h-full">

                                    {/* SCALE PREVIEW FOR UI */}
                                    <div
                                        ref={previewContainerRef}
                                        className="h-auto w-auto aspect-[4/5] lg:w-full lg:max-w-[360px] lg:h-auto rounded-[24px] lg:rounded-[32px] overflow-hidden shadow-2xl border border-white/5 relative bg-slate-900 ring-1 ring-white/10 mx-auto flex items-center justify-center"
                                    >
                                        <div
                                            className={cn("flex flex-col px-[60px] py-[72px] transition-all duration-500 overflow-hidden origin-center shrink-0")}
                                            style={{
                                                width: '1080px',
                                                height: '1350px',
                                                transform: `scale(${previewScale})`,
                                                fontFamily: carousel.slides[currentSlide].font,
                                                backgroundColor: carousel.slides[currentSlide].bgColor,
                                                backgroundImage: carousel.slides[currentSlide].bgImage ? `url(${carousel.slides[currentSlide].bgImage})` : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        >
                                            <div
                                                className="absolute inset-0"
                                                style={{
                                                    backgroundColor: carousel.slides[currentSlide].overlayColor,
                                                    opacity: carousel.slides[currentSlide].overlayOpacity
                                                }}
                                            />
                                            <div className={cn(
                                                "relative z-10 w-full h-full flex flex-col",
                                                carousel.slides[currentSlide].textPosition === 'center' ? "justify-center items-center text-center" :
                                                    carousel.slides[currentSlide].textPosition === 'top' ? "justify-start text-center py-4" :
                                                        carousel.slides[currentSlide].textPosition === 'bottom' ? "justify-end text-center py-4" :
                                                            carousel.slides[currentSlide].textPosition === 'left' ? "justify-center items-start text-left" :
                                                                "justify-center items-end text-right"
                                            )}>
                                                <div
                                                    className="w-full mx-auto transition-all duration-300 box-border"
                                                    style={{
                                                        backgroundColor: hexToRgba(carousel.slides[currentSlide].boxBgColor || "#000000", carousel.slides[currentSlide].boxOpacity ?? 0.8),
                                                        padding: `${carousel.slides[currentSlide].boxPadding || 40}px`,
                                                        borderRadius: '24px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: carousel.slides[currentSlide].textPosition === 'left' ? 'flex-start' :
                                                            carousel.slides[currentSlide].textPosition === 'right' ? 'flex-end' : 'center'
                                                    }}
                                                >
                                                    <h1 className={cn(
                                                        "font-black tracking-tighter break-normal w-full box-border hyphens-none",
                                                        carousel.slides[currentSlide].isItalic && "italic"
                                                    )}
                                                        style={{
                                                            color: carousel.slides[currentSlide].textColor,
                                                            fontFamily: carousel.slides[currentSlide].font,
                                                            fontSize: `${carousel.slides[currentSlide].fontSize}px`, // Raw export size (1080p base)
                                                            fontWeight: (carousel.slides[currentSlide].font?.includes("Bold") || ["Montserrat Bold", "Poppins Bold", "Open Sans ExtraBold"].includes(TITLE_FONTS.find(f => f.value === carousel.slides[currentSlide].font)?.name || "")) ? "bold" : "normal",
                                                            lineHeight: carousel.slides[currentSlide].lineHeight
                                                        }}
                                                    >
                                                        {carousel.slides[currentSlide].text}
                                                    </h1>
                                                    {!carousel.slides[currentSlide].useOnlyMain && (
                                                        <p className={cn(
                                                            "mt-3 opacity-80 leading-relaxed transition-all break-normal w-full box-border hyphens-none",
                                                            // Removed secondaryFont class usage
                                                            carousel.slides[currentSlide].secondaryIsBold ? "font-bold" : "font-medium",
                                                            carousel.slides[currentSlide].secondaryIsItalic && "italic",
                                                            carousel.slides[currentSlide].secondaryUppercase && "uppercase tracking-wider"
                                                        )}
                                                            style={{
                                                                color: carousel.slides[currentSlide].secondaryTextColor,
                                                                fontFamily: carousel.slides[currentSlide].secondaryFont,
                                                                fontSize: `${carousel.slides[currentSlide].secondaryFontSize}px`,
                                                                lineHeight: carousel.slides[currentSlide].secondaryLineHeight
                                                            }}
                                                        >
                                                            {carousel.slides[currentSlide].secondaryText}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between w-full max-w-[360px] mt-4 px-2">
                                        <span className="text-[10px] text-muted-foreground/50 font-bold tracking-widest uppercase">Visualização 4:5</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-[10px] uppercase font-bold tracking-wider text-white/50 hover:text-white hover:bg-white/5 gap-2"
                                            onClick={handleDownloadSlide}
                                            disabled={isSaving || isExporting}
                                        >
                                            <Download className="w-3 h-3" />
                                            Baixar Slide
                                        </Button>
                                    </div>

                                    {/* Slide Navigation for Mobile or Just nice to have near preview */}
                                    <div className="flex items-center gap-6 mt-6">
                                        <Button
                                            variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10 text-white"
                                            onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </Button>
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground">Slide {currentSlide + 1} / {carousel.slides.length}</span>
                                            <div className="flex items-center gap-1.5">
                                                {carousel.slides.map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setCurrentSlide(i)}
                                                        className={cn(
                                                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                            currentSlide === i ? "bg-primary w-6" : "bg-white/20 hover:bg-white/40"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10 text-white"
                                            onClick={() => setCurrentSlide(prev => Math.min((carousel.slides?.length || 1) - 1, prev + 1))}
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Scrollable Editor Area 
                            Mobile: Auto height
                            Desktop: Scrollable independent area
                        */}
                            <div className="h-auto w-full bg-[#09090B] pt-0 lg:pt-0 lg:col-span-6 lg:h-full lg:overflow-y-auto custom-scrollbar">
                                <div className="p-4 sm:p-8 pb-32 space-y-8 max-w-2xl mx-auto">

                                    {/* Block 1: TEXT */}
                                    <div className="bg-slate-900/40 border border-white/5 rounded-[24px] p-6 space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Type className="w-4 h-4" /></div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Texto & Tipografia</h3>
                                            </div>
                                            <Button
                                                className="h-9 px-4 rounded-xl gradient-primary text-white font-bold text-xs gap-2 shadow-lg hover:opacity-90 transition-opacity"
                                                onClick={() => setShowConsultant(true)}
                                            >
                                                <Bot className="w-4 h-4 text-white" />
                                                Consultar IA
                                            </Button>
                                        </div>

                                        <Dialog open={showConsultant} onOpenChange={setShowConsultant}>
                                            <DialogContent className="max-w-4xl h-[85vh] bg-[#09090B] border-white/10 p-0 flex flex-col shadow-2xl">
                                                <DialogHeader className="px-6 py-4 border-b border-white/10 bg-slate-900/50 shrink-0">
                                                    <DialogTitle className="flex items-center gap-2">
                                                        <Bot className="w-5 h-5 text-primary" />
                                                        Assistente de Conteúdo
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <div className="flex-1 overflow-y-auto bg-[#09090B] p-6 lg:p-8">
                                                    <TrainedAIs initialAgentId="carrossel-cultural" />
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground ml-1">Conteúdo Principal</Label>
                                            <Textarea
                                                value={carousel.slides[currentSlide].text}
                                                onChange={(e) => updateSlide(currentSlide, { text: e.target.value })}
                                                className="bg-white/5 border-white/5 rounded-xl min-h-[80px] text-sm resize-none"
                                            />
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-bold text-muted-foreground ml-1">Texto de Apoio</Label>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id="onlyMain" checked={carousel.slides[currentSlide].useOnlyMain}
                                                        onCheckedChange={(checked) => updateSlide(currentSlide, { useOnlyMain: !!checked })}
                                                    />
                                                    <span className="text-[10px] font-bold text-muted-foreground">Somente título</span>
                                                </div>
                                            </div>
                                            {!carousel.slides[currentSlide].useOnlyMain && (
                                                <Textarea
                                                    value={carousel.slides[currentSlide].secondaryText}
                                                    onChange={(e) => updateSlide(currentSlide, { secondaryText: e.target.value })}
                                                    className="bg-white/5 border-white/5 rounded-xl min-h-[60px] text-sm resize-none"
                                                />
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-muted-foreground ml-1">Fonte</Label>
                                                <Select value={carousel.slides[currentSlide].font} onValueChange={(v) => updateSlide(currentSlide, { font: v })}>
                                                    <SelectTrigger className="h-10 bg-white/5 border-white/5 rounded-xl text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                                                        {TITLE_FONTS.map(f => (
                                                            <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                                                {f.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-muted-foreground ml-1">Tamanho</Label>
                                                <div className="flex flex-col bg-white/5 rounded-xl p-3 gap-2">
                                                    <div className="flex justify-between items-center w-full px-1">
                                                        <span className="text-[10px] text-muted-foreground font-mono">{carousel.slides[currentSlide].fontSize}px</span>
                                                    </div>
                                                    <Slider
                                                        value={[carousel.slides[currentSlide].fontSize]}
                                                        min={12}
                                                        max={120}
                                                        step={1}
                                                        onValueChange={(val) => updateSlide(currentSlide, { fontSize: val[0] })}
                                                        className="py-1"
                                                    />
                                                </div>
                                            </div>

                                            <div className="col-span-2 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] font-bold text-muted-foreground ml-1">Altura da Linha</Label>
                                                    <span className="text-[10px] text-muted-foreground font-mono">{carousel.slides[currentSlide].lineHeight || "1.2"}</span>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3">
                                                    <Slider
                                                        value={[parseFloat(carousel.slides[currentSlide].lineHeight || "1.2")]}
                                                        min={0.8}
                                                        max={2.5}
                                                        step={0.1}
                                                        onValueChange={(val) => updateSlide(currentSlide, { lineHeight: val[0].toString() })}
                                                        className="py-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Configurações do Subtítulo */}
                                        {!carousel.slides[currentSlide].useOnlyMain && (
                                            <div className="pt-4 mt-4 border-t border-white/5 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estilo do Subtítulo</Label>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold text-muted-foreground ml-1">Fonte</Label>
                                                        <Select value={carousel.slides[currentSlide].secondaryFont} onValueChange={(v) => updateSlide(currentSlide, { secondaryFont: v })}>
                                                            <SelectTrigger className="h-10 bg-white/5 border-white/5 rounded-xl text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                                                                {SUBTITLE_FONTS.map(f => (
                                                                    <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                                                        {f.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold text-muted-foreground ml-1">Tamanho</Label>
                                                        <div className="flex flex-col bg-white/5 rounded-xl p-3 gap-2">
                                                            <div className="flex justify-between items-center w-full px-1">
                                                                <span className="text-[10px] text-muted-foreground font-mono">{carousel.slides[currentSlide].secondaryFontSize}px</span>
                                                            </div>
                                                            <Slider
                                                                value={[carousel.slides[currentSlide].secondaryFontSize]}
                                                                min={8}
                                                                max={60}
                                                                step={1}
                                                                onValueChange={(val) => updateSlide(currentSlide, { secondaryFontSize: val[0] })}
                                                                className="py-1"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 space-y-2">
                                                        <Label className="text-[10px] font-bold text-muted-foreground ml-1">Cor</Label>
                                                        <input
                                                            type="color" value={carousel.slides[currentSlide].secondaryTextColor}
                                                            onChange={(e) => updateSlide(currentSlide, { secondaryTextColor: e.target.value })}
                                                            className="w-full h-10 bg-transparent border-none cursor-pointer p-0.5 rounded-lg"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold text-muted-foreground ml-1">Formatação</Label>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className={cn("h-10 w-10 rounded-xl bg-white/5", carousel.slides[currentSlide].secondaryIsBold && "bg-primary text-white")}
                                                                onClick={() => updateSlide(currentSlide, { secondaryIsBold: !carousel.slides[currentSlide].secondaryIsBold })}
                                                            >
                                                                <Bold className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className={cn("h-10 w-10 rounded-xl bg-white/5", carousel.slides[currentSlide].secondaryIsItalic && "bg-primary text-white")}
                                                                onClick={() => updateSlide(currentSlide, { secondaryIsItalic: !carousel.slides[currentSlide].secondaryIsItalic })}
                                                            >
                                                                <Italic className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3 pt-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-[10px] font-bold text-muted-foreground ml-1">Entrelinha (Altura)</Label>
                                                            <span className="text-[10px] font-bold text-primary">{carousel.slides[currentSlide].secondaryLineHeight || "1.5"}</span>
                                                        </div>
                                                        <Slider
                                                            min={0.8}
                                                            max={2.5}
                                                            step={0.1}
                                                            value={[parseFloat(carousel.slides[currentSlide].secondaryLineHeight || "1.5")]}
                                                            onValueChange={(v) => updateSlide(currentSlide, { secondaryLineHeight: v[0].toFixed(1) })}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="space-y-2 flex-1">
                                                        <Label className="text-[10px] font-bold text-muted-foreground ml-1">Estilo Extra</Label>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost" size="sm"
                                                                className={cn("flex-1 h-9 rounded-xl bg-white/5 text-xs font-bold", carousel.slides[currentSlide].secondaryUppercase && "bg-primary text-white")}
                                                                onClick={() => updateSlide(currentSlide, { secondaryUppercase: !carousel.slides[currentSlide].secondaryUppercase })}
                                                            >
                                                                AA
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Block 1.5: BLOCO DE DESTAQUE */}
                                    <div className="bg-slate-900/40 border border-white/5 rounded-[24px] p-6 space-y-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Settings2 className="w-4 h-4" /></div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Bloco de Destaque</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ativar Fundo</Label>
                                                <Checkbox
                                                    checked={(carousel.slides[currentSlide].boxOpacity ?? 0.8) > 0}
                                                    onCheckedChange={(checked) => updateSlide(currentSlide, { boxOpacity: checked ? 0.8 : 0 })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold text-muted-foreground ml-1">Cor do Bloco</Label>
                                                    <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/5">
                                                        <input
                                                            type="color"
                                                            value={carousel.slides[currentSlide].boxBgColor || "#000000"}
                                                            onChange={(e) => updateSlide(currentSlide, { boxBgColor: e.target.value })}
                                                            className="w-8 h-8 rounded-lg bg-transparent cursor-pointer"
                                                        />
                                                        <span className="text-[10px] font-mono text-white/50">{carousel.slides[currentSlide].boxBgColor || "#000000"}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold text-muted-foreground ml-1">Transparência</Label>
                                                    <div className="pt-2 px-1">
                                                        <Slider
                                                            value={[(carousel.slides[currentSlide].boxOpacity ?? 0.8) * 100]}
                                                            max={100}
                                                            step={1}
                                                            onValueChange={(v) => updateSlide(currentSlide, { boxOpacity: v[0] / 100 })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] font-bold text-muted-foreground ml-1">Preenchimento (Padding)</Label>
                                                    <span className="text-[10px] text-muted-foreground font-mono">{carousel.slides[currentSlide].boxPadding || 40}px</span>
                                                </div>
                                                <Slider
                                                    value={[carousel.slides[currentSlide].boxPadding || 40]}
                                                    min={0} max={120} step={4}
                                                    onValueChange={(v) => updateSlide(currentSlide, { boxPadding: v[0] })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Block 2: LAYOUT & CORES */}
                                    <div className="bg-slate-900/40 border border-white/5 rounded-[24px] p-6 space-y-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Palette className="w-4 h-4" /></div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Layout & Cores</h3>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-muted-foreground ml-1">Posição Texto</Label>
                                                <Select value={carousel.slides[currentSlide].textPosition} onValueChange={(v: any) => updateSlide(currentSlide, { textPosition: v })}>
                                                    <SelectTrigger className="h-10 bg-white/5 border-white/5 rounded-xl text-xs uppercase font-bold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                        {Object.keys(POSITIONS).map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-muted-foreground ml-1">Cor do Título</Label>
                                                <input
                                                    type="color" value={carousel.slides[currentSlide].textColor}
                                                    onChange={(e) => updateSlide(currentSlide, { textColor: e.target.value })}
                                                    className="w-full h-10 bg-transparent border-none cursor-pointer p-0.5 rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-2 border-t border-white/5 mt-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-bold text-muted-foreground">Película (Overlay)</Label>
                                                <span className="text-[10px] font-bold text-primary">{Math.round((carousel.slides?.[currentSlide]?.overlayOpacity || 0) * 100)}%</span>
                                            </div>
                                            <Slider
                                                value={[carousel.slides[currentSlide].overlayOpacity * 100]}
                                                max={100} step={1}
                                                onValueChange={(v) => updateSlide(currentSlide, { overlayOpacity: v[0] / 100 })}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>

                                    {/* Block 3: IMAGEM */}
                                    <div className="bg-slate-900/40 border border-white/5 rounded-[24px] p-6 space-y-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><ImageIcon className="w-4 h-4" /></div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Fundo & Mídia</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex gap-3">
                                                <Button
                                                    variant="outline" size="sm" className="flex-1 bg-white/5 border-white/10 text-xs rounded-xl h-10 gap-2"
                                                    onClick={() => document.getElementById('bg-upload')?.click()}
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                    Subir Imagem
                                                </Button>
                                                <input
                                                    id="bg-upload" type="file" className="hidden" accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (re) => updateSlide(currentSlide, { bgImage: re.target?.result as string });
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                                {carousel.slides[currentSlide].bgImage && (
                                                    <Button
                                                        variant="ghost" size="icon" className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl"
                                                        onClick={() => updateSlide(currentSlide, { bgImage: undefined })}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Label className="text-[10px] font-bold text-muted-foreground ml-1">Cor do Fundo</Label>
                                                <input
                                                    type="color" value={carousel.slides[currentSlide].bgColor}
                                                    onChange={(e) => updateSlide(currentSlide, { bgColor: e.target.value })}
                                                    className="flex-1 h-8 bg-transparent border-none cursor-pointer p-0.5 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        className="gradient-primary w-full h-14 md:h-16 px-6 md:px-10 rounded-[24px] text-white font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 md:gap-4 hover:scale-105 active:scale-95 transition-all mt-4"
                                        onClick={handleExport}
                                        disabled={isExporting}
                                    >
                                        {isExporting ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <Download className="w-5 h-5 md:w-6 md:h-6" />}
                                        Exportar Carrossel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 w-full max-w-6xl mx-auto px-6 sm:px-8 flex flex-col items-center justify-center h-full min-h-[70vh]">
                            {/* Empty State / Welcome */}
                            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center animate-in fade-in duration-1000 w-full">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center mb-6 ring-4 ring-primary/10 rotate-3">
                                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-pulse" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white italic leading-tight">
                                    Motor de Carrosséis <span className="text-primary not-italic">Yah 2.0</span>
                                </h2>
                                <p className="text-muted-foreground text-xs sm:text-sm max-w-[280px] sm:max-w-sm mt-4 font-medium leading-relaxed">
                                    Dê vida às suas teses e diagnósticos. Gere uma narrativa completa e estratégica pronta para publicar.
                                </p>

                                <div className="mt-10 flex flex-col gap-4 items-center w-full max-w-[320px] sm:max-w-none">
                                    <Dialog open={showGenModal} onOpenChange={setShowGenModal}>
                                        <DialogTrigger asChild>
                                            <Button className="gradient-primary text-white h-14 sm:h-16 px-8 sm:px-10 rounded-2xl sm:rounded-[24px] font-black gap-3 shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto text-base sm:text-lg">
                                                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                                                Gerar carrossel com IA
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-slate-950 border-white/10 text-white max-w-lg rounded-[32px] w-[95vw] sm:w-full">
                                            <DialogHeader>
                                                <DialogTitle className="text-2xl font-black italic">Configurar Estratégia</DialogTitle>
                                                <DialogDescription className="text-muted-foreground">Personalize as diretrizes da IA</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-6 py-4 px-2">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-2">Modo do carrossel</Label>
                                                    <Select value={carousel.mode} onValueChange={(v: any) => setCarousel(prev => ({ ...prev, mode: v }))}>
                                                        <SelectTrigger className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 focus:ring-primary/20">
                                                            <SelectValue placeholder="Escolha o modo" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                            <SelectItem value="editorial">Modo Editorial (Emocional/Profundo)</SelectItem>
                                                            <SelectItem value="cultural">Modo Cultural (Crítico/Sofisticado)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-2">Tema do carrossel</Label>
                                                    <Input
                                                        className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 focus:ring-primary/20"
                                                        placeholder="Ex: Como proteger sua mente..."
                                                        value={carousel.topic}
                                                        onChange={(e) => setCarousel(prev => ({ ...prev, topic: e.target.value }))}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-2">Objetivo</Label>
                                                        <Select value={carousel.objective} onValueChange={(v: any) => setCarousel(prev => ({ ...prev, objective: v }))}>
                                                            <SelectTrigger className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 focus:ring-primary/20">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                                {["atração", "conexão", "venda invisível", "educacional"].map(o => (
                                                                    <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-2">Emoção</Label>
                                                        <Select value={carousel.emotion} onValueChange={(v: any) => setCarousel(prev => ({ ...prev, emotion: v }))}>
                                                            <SelectTrigger className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 focus:ring-primary/20">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                                {["identificação", "alívio", "coragem", "provocação", "inspiração"].map(e => (
                                                                    <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-4 border-t border-white/5">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-2">Fonte de Conteúdo</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id="useTrained"
                                                            checked={useTrainedContent}
                                                            onCheckedChange={(c) => setUseTrainedContent(!!c)}
                                                        />
                                                        <label htmlFor="useTrained" className="text-xs font-bold text-white cursor-pointer">
                                                            Usar IA Treinada (Carrossel Cultural)
                                                        </label>
                                                    </div>
                                                </div>

                                                {useTrainedContent && (
                                                    <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-xs text-primary/80 leading-relaxed">
                                                        <p>A IA irá ignorar o tema acima e usará o último roteiro gerado pelo agente <strong>YAh – Carrossel Cultural</strong>.</p>
                                                    </div>
                                                )}
                                            </div>
                                            <DialogFooter className="pt-4">
                                                <Button
                                                    onClick={handleGenerateWithAI}
                                                    disabled={isGenerating}
                                                    className="w-full h-16 rounded-[24px] gradient-primary font-black text-lg gap-3"
                                                >
                                                    {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                                                    Criar carrossel com IA
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    <button
                                        onClick={() => setShowGenModal(true)}
                                        className="h-14 px-8 sm:px-10 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        Criar novo carrossel
                                    </button>
                                </div>
                            </div>

                            {/* History Section */}
                            {history.length > 0 && (
                                <div className="mt-16 space-y-6">
                                    <div className="flex items-center gap-3 px-2">
                                        <Clock className="w-5 h-5 text-primary" />
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Carrosséis Salvos</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                        {history.map((item) => (
                                            <div
                                                key={item.id}
                                                className="group bg-slate-900/40 border border-white/5 hover:border-primary/30 rounded-[32px] p-6 transition-all duration-300 hover:bg-slate-900/60 cursor-pointer flex flex-col gap-4 relative overflow-hidden"
                                                onClick={() => {
                                                    // Hydrate slides with defaults to prevent crashes on old data
                                                    const hydratedSlides = (item.slides || []).map((s: any) => ({
                                                        font: "'Playfair Display', serif",
                                                        fontSize: 66,
                                                        textColor: "#ffffff",
                                                        boxBgColor: "#000000",
                                                        boxPadding: 40,
                                                        textPosition: "center",
                                                        overlayColor: "#000000",
                                                        overlayOpacity: 0.5,
                                                        lineHeight: "1.2",
                                                        useOnlyMain: false,
                                                        secondaryFont: "'Inter', sans-serif",
                                                        secondaryFontSize: 30,
                                                        secondaryTextColor: "#cccccc",
                                                        secondaryLineHeight: "1.5",
                                                        secondaryIsBold: false,
                                                        secondaryIsItalic: false,
                                                        secondaryUppercase: false,
                                                        ...s
                                                    }));
                                                    setCarousel({ ...item, slides: hydratedSlides });
                                                    setCurrentSlide(0);
                                                }}
                                            >
                                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                        <ChevronRight className="w-5 h-5" />
                                                    </div>
                                                </div>

                                                <div className="absolute top-4 right-16 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                                                        onClick={(e) => handleDelete(e, item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                <div className="space-y-1 pr-10">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                            item.mode === 'editorial' ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                                                        )}>
                                                            Modo {item.mode}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-white/30 truncate">
                                                            {new Date(item.updated_at as any).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-lg font-bold text-white leading-tight line-clamp-2">
                                                        {item.topic}
                                                    </h4>
                                                </div>

                                                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-2 border-t border-white/5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Target className="w-3 h-3" />
                                                        {item.objective}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-primary/70">
                                                        <Sparkles className="w-3 h-3" />
                                                        10 Slides
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* --- HIDDEN EXPORT LAYER --- */}
                {
                    carousel.slides && carousel.slides.length > 0 && (
                        <div className="fixed top-0 left-[-9999px] pointer-events-none opacity-0 overflow-hidden">
                            {carousel.slides.map((slide, idx) => (
                                <div
                                    key={`export-slide-${idx}`}
                                    ref={el => slideRefs.current[idx] = el}
                                    style={{
                                        width: '1080px',
                                        height: '1350px',
                                        backgroundColor: slide.bgColor,
                                        backgroundImage: slide.bgImage ? `url(${slide.bgImage})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                    className="export-node"
                                >
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            backgroundColor: slide.overlayColor,
                                            opacity: slide.overlayOpacity
                                        }}
                                    />
                                    <div className={cn(
                                        "relative z-10 w-full h-full flex flex-col px-[60px] py-[72px] overflow-hidden",
                                        slide.textPosition === 'center' ? "justify-center items-center text-center" :
                                            slide.textPosition === 'top' ? "justify-start text-center py-[48px]" :
                                                slide.textPosition === 'bottom' ? "justify-end text-center py-[48px]" :
                                                    slide.textPosition === 'left' ? "justify-center items-start text-left" :
                                                        "justify-center items-end text-right"
                                    )}>
                                        <div
                                            style={{
                                                backgroundColor: hexToRgba(slide.boxBgColor || "#000000", slide.boxOpacity ?? 0.8),
                                                padding: `${slide.boxPadding}px`,
                                                borderRadius: '24px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center'
                                            }}
                                            className="w-full box-border"
                                        >
                                            <h1 className={cn(
                                                "font-black tracking-tighter break-normal w-full box-border hyphens-none",
                                                slide.isItalic && "italic"
                                            )}
                                                style={{
                                                    color: slide.textColor,
                                                    fontFamily: slide.font,
                                                    lineHeight: slide.lineHeight,
                                                    fontSize: `${slide.fontSize}px`,
                                                    fontWeight: (slide.font?.includes("Bold") || ["Montserrat Bold", "Poppins Bold", "Open Sans ExtraBold"].includes(TITLE_FONTS.find(f => f.value === slide.font)?.name || "")) ? "bold" : "normal"
                                                }}
                                            >
                                                {slide.text}
                                            </h1>
                                            {!slide.useOnlyMain && (
                                                <p className={cn(
                                                    "mt-10 opacity-80 transition-all break-normal w-full hyphens-none",
                                                    slide.secondaryFont,
                                                    slide.secondaryIsBold ? "font-bold" : "font-medium",
                                                    slide.secondaryIsItalic && "italic",
                                                    slide.secondaryUppercase && "uppercase tracking-wider"
                                                )}
                                                    style={{
                                                        color: slide.secondaryTextColor,
                                                        fontFamily: slide.secondaryFont,
                                                        lineHeight: slide.secondaryLineHeight,
                                                        fontSize: `${slide.secondaryFontSize}px`
                                                    }}
                                                >
                                                    {slide.secondaryText}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }

                {/* Footer Bar */}
                {
                    carousel.slides && carousel.slides.length > 0 && (
                        <footer className="fixed bottom-0 left-0 right-0 h-auto py-4 md:h-28 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 px-4 md:px-8 flex items-center justify-center z-50">
                            <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                                <div className="flex items-center gap-3 w-full md:w-auto justify-center">
                                    <Button
                                        variant="outline" className="flex-1 md:flex-none h-10 md:h-12 px-4 md:px-6 border-white/10 bg-white/5 text-white rounded-2xl font-bold gap-2 hover:bg-white/10 text-xs md:text-sm"
                                        onClick={handleApplyStyleToAll}
                                    >
                                        <Copy className="w-4 h-4" />
                                        <span className="md:inline uppercase tracking-widest text-[10px] md:text-xs">Aplicar Tudo</span>
                                    </Button>
                                    <Button
                                        variant="outline" className="flex-1 md:flex-none h-10 md:h-12 px-4 md:px-6 border-white/10 bg-white/5 text-white rounded-2xl font-bold gap-2 hover:bg-white/10 text-xs md:text-sm"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span className="md:inline uppercase tracking-widest text-[10px] md:text-xs">Salvar</span>
                                    </Button>
                                </div>


                            </div>
                        </footer>
                    )
                }
            </div>
        </div>
    );
}
