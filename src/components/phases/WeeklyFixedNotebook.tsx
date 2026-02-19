import React, { useState, useEffect, useRef } from "react";
import {
    ChevronRight,
    ChevronLeft,
    Save,
    Wand2,
    Settings,
    Calendar as CalendarIcon,
    Table,
    MoreHorizontal,
    Sparkles,
    CheckCircle2,
    Layout,
    Plus,
    Trash2,
    Loader2,
    ArrowRight,
    Info,
    Clock,
    Instagram,
    Clapperboard,
    Camera,
    MessageSquare,
    Search,
    Book,
    Link,
    Share2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useBrand, Brand, BRAND_LITE_FIELDS } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Screen = "vision" | "routine" | "monthly" | "detail";
type DetailTab = "feed" | "stories";

const DAYS_OF_WEEK = [
    "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"
];

const INTENTION_OPTIONS = [
    "Identificação", "Educação", "Cultura", "Conexão", "Vendas Invisíveis", "Inspiração"
];

const FEED_FORMATS = ["Carrossel", "Reels", "Foto", "Alternar"];
const STORIES_FORMATS = ["Caixa", "Diário", "Sequência", "Conversa"];

const DAILY_AI_TIPS: Record<number, { title: string; topic: string; format: string }> = {
    1: { // Segunda
        title: "Segunda — Conexão",
        topic: "algo que faça a pessoa se reconhecer.\nMostre um pensamento, situação ou sentimento comum do seu público.",
        format: "story, frase, cena real, bastidor."
    },
    2: { // Terça
        title: "Terça — Educação",
        topic: "algo que ensine de forma simples.\nExplique um conceito, erro comum ou ajuste prático.",
        format: "dica curta, carrossel simples, mini-aula."
    },
    3: { // Quarta
        title: "Quarta — Autoridade",
        topic: "sua forma de fazer, analisar ou resolver.\nMostre como você pensa — não só o que você faz.",
        format: "explicação guiada, comparação, análise."
    },
    4: { // Quinta
        title: "Quinta — Método / Ferramenta",
        topic: "um processo, passo ou ferramenta que ajuda.\nMostre o caminho, não só o resultado.",
        format: "passo a passo, checklist, tela, modelo."
    },
    5: { // Sexta
        title: "Sexta — Prova / Resultado",
        topic: "transformação possível.\nPode ser caso, exemplo, antes/depois de cenário, evolução.",
        format: "estudo de caso, história curta, cenário real."
    },
    6: { // Sábado
        title: "Sábado — Visão / Bastidores Humanos",
        topic: "o que ninguém vê.\nMostre bastidor, reflexão, processo interno, valores.",
        format: "relato, bastidor leve, pensamento em voz alta."
    },
    0: { // Domingo
        title: "Domingo — Direção / Consciência",
        topic: "direção e clareza.\nAjude a pessoa a enxergar o próximo passo.",
        format: "pergunta guiada, reflexão estratégica, norte."
    }
};

export function WeeklyFixedNotebook({ onComplete }: { onComplete?: () => void }) {
    const { user } = useAuth();
    const { brand, updateBrand } = useBrand({
        select: `${BRAND_LITE_FIELDS}, weekly_structure_data`
    });
    const { getSetting } = useSystemSettings();

    const [screen, setScreen] = useState<Screen>("vision");
    const [currentWeek, setCurrentWeek] = useState(1);
    const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
    const [detailTab, setDetailTab] = useState<DetailTab>("feed");
    const [isFormInitialized, setIsFormInitialized] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingIntentions, setIsGeneratingIntentions] = useState(false);
    const [isWritingScript, setIsWritingScript] = useState(false);
    const [isWritingCaption, setIsWritingCaption] = useState(false);
    const isDirty = useRef(false);

    const [routineData, setRoutineData] = useState<Partial<Brand>>({});
    const [weeklyData, setWeeklyData] = useState<any>({});
    const [routineConfirmation, setRoutineConfirmation] = useState<{ isOpen: boolean, type: "planning" | "execution" | null, days: string[] }>({ isOpen: false, type: null, days: [] });

    const location = useLocation();

    useEffect(() => {
        if (brand && !isFormInitialized) {
            setRoutineData({
                routine_posts_per_week: brand.routine_posts_per_week || 3,
                routine_planning_days: brand.routine_planning_days || [],
                routine_execution_days: brand.routine_execution_days || [],
                routine_posting_days: brand.routine_posting_days || ["Segunda", "Quarta", "Sexta"],
                routine_feed_format_prefs: brand.routine_feed_format_prefs || {},
                routine_intentions_prefs: brand.routine_intentions_prefs || {},
                routine_fixed_hours: brand.routine_fixed_hours || [],
            });
            setWeeklyData(brand.weekly_structure_data || {});
            setIsFormInitialized(true);

            if (!brand.routine_posts_per_week) {
                setScreen("routine");
            }
        }
    }, [brand, isFormInitialized]);

    // Handle incoming navigation state from Dashboard
    useEffect(() => {
        const state = location.state as { targetDate?: string | Date; tab?: string } | null;
        if (state && state.targetDate && state.tab) {
            const { targetDate, tab } = state;
            const dateObj = new Date(targetDate);

            // Logic to calculate week and day index similar to handleDateSelect
            const today = new Date();
            const currentDay = today.getDay();
            const diff = currentDay === 0 ? -6 : 1 - currentDay;
            const mondayOfWeek1 = new Date(today);
            mondayOfWeek1.setDate(today.getDate() + diff);
            mondayOfWeek1.setHours(0, 0, 0, 0);

            const selectedDate = new Date(dateObj);
            selectedDate.setHours(0, 0, 0, 0);

            const diffDays = differenceInCalendarDays(selectedDate, mondayOfWeek1);
            const newWeekIndex = Math.floor(diffDays / 7);
            const newDayIdx = selectedDate.getDay();

            if (newWeekIndex >= 0 && newWeekIndex < 4) {
                setCurrentWeek(newWeekIndex + 1);
                setSelectedDayIndex(newDayIdx);
                setDetailTab(tab as DetailTab);
                setScreen("detail");

                // Clear state to avoid reopening on refresh/back if desired, 
                // but React Router state relies on navigation, so it's usually fine.
                // We can replace the current history entry to clear state if needed:
                // window.history.replaceState({}, document.title);
            }
        }
    }, [location.state]);

    const handleRoutineChange = (field: keyof Brand, value: any) => {
        setRoutineData(prev => ({ ...prev, [field]: value }));
        isDirty.current = true;
    };

    const handleDataChange = (tab: DetailTab, field: string, value: any, blockIndex?: number) => {
        const newData = JSON.parse(JSON.stringify(weeklyData)); // Deep clone
        if (!newData[currentWeek - 1]) newData[currentWeek - 1] = {};
        if (!newData[currentWeek - 1][selectedDayIndex]) {
            newData[currentWeek - 1][selectedDayIndex] = { feed: {}, stories: {} };
        }

        const dayTab = newData[currentWeek - 1][selectedDayIndex][tab];

        if (blockIndex === undefined || blockIndex === 0) {
            dayTab[field] = value;
        } else {
            if (!dayTab.extraBlocks) dayTab.extraBlocks = [];
            if (dayTab.extraBlocks[blockIndex - 1]) {
                dayTab.extraBlocks[blockIndex - 1][field] = value;
            }
        }

        setWeeklyData(newData);
        isDirty.current = true;
    };

    const saveRoutine = async () => {
        try {
            await updateBrand.mutateAsync({ updates: routineData });
            toast.success("Rotina salva!");
            isDirty.current = false;
        } catch (error) {
            toast.error("Erro ao salvar rotina");
        }
    };

    const saveWeeklyData = async (silent: boolean = false) => {
        try {
            await updateBrand.mutateAsync({ updates: { weekly_structure_data: weeklyData }, silent });
            if (!silent) toast.success("Ajustes salvos!");
            isDirty.current = false;
        } catch (error) {
            if (!silent) toast.error("Erro ao salvar ajustes");
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (!isDirty.current) return;

        const timeoutId = setTimeout(() => {
            saveWeeklyData(true);
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [weeklyData]);


    const generateWeeklyStructure = async () => {
        const toastId = toast.loading("Gerando estrutura de 4 semanas com IA... Isso pode levar alguns segundos.");
        setIsGenerating(true);
        try {
            // Retrieve API Key from settings (fallback for Edge Function)
            const apiKey = getSetting("openai_api_key")?.value?.trim();

            // Call Supabase Edge Function
            const { data: result, error } = await supabase.functions.invoke('generate-weekly-structure', {
                body: {
                    brand,
                    routine: routineData,
                    apiKey // Pass the key to the function
                }
            });

            if (error) throw error;

            if (!result || !result.weeks || !Array.isArray(result.weeks)) {
                console.error("AI response invalid:", result);
                throw new Error("A IA retornou um formato inválido. Por favor, tente novamente.");
            }

            // Post-process to ensure strict compliance and correct mapping
            const postingDaysSet = new Set(routineData.routine_posting_days || []);
            const finalWeeks = result.weeks.map((week: any) => {
                const cleanedWeek: any = {};
                DAYS_OF_WEEK.forEach((dayName, idx) => {
                    if (postingDaysSet.has(dayName)) {
                        // Resilient mapping: check for index (0, "0"), Portuguese full name, or Portuguese short name
                        const aiContent =
                            week[idx] ||
                            week[idx.toString()] ||
                            week[dayName] ||
                            week[dayName.substring(0, 3)] ||
                            week[dayName.toLowerCase()] ||
                            { feed: {}, stories: {} };

                        cleanedWeek[idx] = {
                            feed: {
                                format: aiContent.feed?.format || 'Carrossel',
                                intention: aiContent.feed?.intention || 'Conexão',
                                headline: aiContent.feed?.headline || 'Título pendente...',
                                instruction: aiContent.feed?.instruction || 'Crie um post engajador.',
                                status: 'planned',
                                notes: '',
                                time: aiContent.feed?.time || routineData.routine_fixed_hours?.[0] || '',
                                link: aiContent.feed?.link || ''
                            },
                            stories: {
                                format: aiContent.stories?.format || 'Sequência',
                                intention: aiContent.stories?.intention || 'Engajamento',
                                headline: aiContent.stories?.headline || 'Headline pendente...',
                                instruction: aiContent.stories?.instruction || 'Compartilhe nos stories.',
                                status: 'planned',
                                notes: '',
                                time: aiContent.stories?.time || routineData.routine_fixed_hours?.[0] || '',
                                link: aiContent.stories?.link || ''
                            }
                        };
                    } else {
                        cleanedWeek[idx] = { feed: {}, stories: {} };
                    }
                });
                return cleanedWeek;
            });

            await updateBrand.mutateAsync({
                updates: {
                    weekly_structure_data: finalWeeks,
                    ...routineData
                }
            });

            setWeeklyData(finalWeeks);
            setScreen("vision");
            toast.success("Estratégia semanal gerada com sucesso!", { id: toastId });

            if (onComplete) {
                setTimeout(() => {
                    onComplete();
                }, 1500);
            }
        } catch (error: any) {
            console.error("Erro detalhado:", error);
            toast.error("Erro ao gerar: " + (error.message || "Erro desconhecido"), { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    const [adjustingBlock, setAdjustingBlock] = useState<{ tab: string, index: number } | null>(null);
    const [adjustmentText, setAdjustmentText] = useState("");
    const [isGeneratingHeadline, setIsGeneratingHeadline] = useState(false);

    const handleGenerateHeadline = async (tab: DetailTab, blockIndex?: number) => {
        const toastId = toast.loading("Gerando sugestão de título...");
        setIsGeneratingHeadline(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value?.trim();
            if (!apiKey) throw new Error("API Key não configurada");

            const dayData = weeklyData[currentWeek - 1][selectedDayIndex][tab];
            const block = (blockIndex === undefined || blockIndex === 0)
                ? dayData
                : dayData.extraBlocks[blockIndex - 1];

            const prompt = `Gere 1 (UM) título curto, magnético e persuasivo para um ${tab === 'feed' ? 'Post de Feed' : 'Stories'} do Instagram.
            Formato: ${block.format}
            Intenção: ${block.intention}
            DNA da Marca: ${brand?.dna_tese}
            Contexto Atual: ${block.headline || "Sem contexto definido"}
            
            Retorne APENAS o texto do título, sem aspas, sem explicações.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Expert em copywriting de headlines virais. Você cria ganchos impossíveis de ignorar." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const data = await response.json();
            const newHeadline = data.choices[0].message.content.replace(/^["']|["']$/g, ''); // Remove quotes if present
            handleDataChange(tab, "headline", newHeadline, blockIndex);
            toast.success("Título sugerido!", { id: toastId });
        } catch (error: any) {
            toast.error("Erro ao gerar título", { id: toastId });
        } finally {
            setIsGeneratingHeadline(false);
        }
    };


    const handleWriteScript = async (tab: DetailTab, blockIndex?: number, adjustment?: string) => {
        const toastId = toast.loading(adjustment ? "Ajustando roteiro..." : "Gerando roteiro detalhado...");
        setIsWritingScript(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value?.trim();
            if (!apiKey) throw new Error("API Key não configurada");

            const dayData = weeklyData[currentWeek - 1][selectedDayIndex][tab];
            const block = (blockIndex === undefined || blockIndex === 0)
                ? dayData
                : dayData.extraBlocks[blockIndex - 1];

            let prompt = "";

            if (adjustment && block.notes) {
                prompt = `Aqui está o roteiro atual:
                
                ${block.notes}
                
                REAJUSTE este roteiro seguindo esta nova instrução: "${adjustment}".
                
                Mantenha a estrutura, mas aplique o ajuste solicitado.`;
            } else {
                prompt = `Gere um roteiro detalhado para um ${tab === 'feed' ? 'Post de Feed' : 'Stories'} do Instagram.
                Título/Tema: ${block.headline}
                Formato: ${block.format}
                Intenção: ${block.intention}
                DNA da Marca: ${brand?.dna_tese}
                Instrução da IA: ${block.instruction || "Crie um conteúdo estratégico."}
                
                Gere um roteiro estruturado, direto e persuasivo.`;
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Expert em copywriting e roteirização para redes sociais. Você foca em manter a voz da marca e a estratégia do conteúdo. NÃO use markdown, negrito (**), itálico ou qualquer formatação especial. Apenas texto puro e direto." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const data = await response.json();
            const script = data.choices[0].message.content;
            handleDataChange(tab, "notes", script, blockIndex);
            toast.success(adjustment ? "Roteiro ajustado com sucesso!" : "Roteiro sugerido com sucesso!", { id: toastId });
            setAdjustingBlock(null);
            setAdjustmentText("");
        } catch (error: any) {
            toast.error("Erro ao gerar roteiro: " + error.message, { id: toastId });
        } finally {
            setIsWritingScript(false);
        }
    };

    const handleWriteCaption = async (tab: DetailTab, blockIndex?: number) => {
        const toastId = toast.loading("Sugerindo legenda estratégica...");
        setIsWritingCaption(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value?.trim();
            if (!apiKey) throw new Error("API Key não configurada");

            const dayData = weeklyData[currentWeek - 1][selectedDayIndex][tab];
            const block = (blockIndex === undefined || blockIndex === 0)
                ? dayData
                : dayData.extraBlocks[blockIndex - 1];

            const prompt = `Escreva uma legenda envolvente para o Instagram sobre este tema: "${block.headline}".
            Intenção: ${block.intention}.
            Use o tom de voz da marca: ${brand?.user_tone_selected?.join(", ") || "autêntico e profissional"}.
            Inclua emojis e 3-5 hashtags relevantes.
            Formatação: Quebras de linha limpas.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Expert em social media e copywriting. Você cria legendas que engajam e convertem." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const data = await response.json();
            const caption = data.choices[0].message.content;
            handleDataChange(tab, "caption", caption, blockIndex);
            toast.success("Legenda sugerida com sucesso!", { id: toastId });
        } catch (error: any) {
            toast.error("Erro ao gerar legenda: " + error.message, { id: toastId });
        } finally {
            setIsWritingCaption(false);
        }
    };

    const handleExportWhatsApp = (tab: DetailTab, blockIndex?: number) => {
        const dayData = weeklyData[currentWeek - 1][selectedDayIndex][tab];
        const block = (blockIndex === undefined || blockIndex === 0)
            ? dayData
            : dayData.extraBlocks[blockIndex - 1];

        const text = `📌 *TEMA:* ${block.headline || 'Sem título'}

📝 *ROTEIRO:*
${block.notes || 'Sem roteiro.'}

✍️ *LEGENDA:*
${block.caption || 'Sem legenda.'}`;

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const executeSendRoutineToAgenda = async () => {
        const { type, days: selectedDays } = routineConfirmation;
        if (!user || !type || selectedDays.length === 0) return;

        const dayMapping: { [key: string]: number } = {
            "Domingo": 0, "Segunda": 1, "Terça": 2, "Quarta": 3,
            "Quinta": 4, "Sexta": 5, "Sábado": 6
        };

        const dayIds = selectedDays.map(day => dayMapping[day]).sort();

        const title = type === "planning" ? "Criar Roteiros" : "Gravar/Executar Conteúdo";

        // Data de hoje como referência inicial
        const today = new Date();
        const formattedDate = format(today, "yyyy-MM-dd");

        const eventData = {
            titulo: title,
            categoria: "Conteúdo",
            tipo: "Tarefa",
            recorrencia: "Semanal",
            dias_da_semana: dayIds,
            data: formattedDate,
            hora: "09:00",
            duracao: 60,
            status: "Pendente",
            user_id: user.id,
            descricao: `Tarefa recorrente gerada pela Rotina Semanal.`
        };

        try {
            const { error } = await (supabase as any)
                .from("eventos_do_cerebro")
                .insert(eventData);

            if (error) throw error;
            toast.success(`Tarefas de ${type === "planning" ? "planejamento" : "execução"} agendadas!`);
        } catch (error: any) {
            console.error("Erro ao agendar rotina:", error);
            toast.error("Erro ao agendar rotina.");
        } finally {
            setRoutineConfirmation({ isOpen: false, type: null, days: [] });
        }
    };

    const handleSendRoutineToAgenda = (type: "planning" | "execution", selectedDays: string[]) => {
        if (!selectedDays || selectedDays.length === 0) {
            toast.error("Selecione pelo menos um dia da semana.");
            return;
        }
        setRoutineConfirmation({ isOpen: true, type, days: selectedDays });
    };


    const handleCreateWithAI = (tab: DetailTab, blockIndex?: number) => {
        const dayData = weeklyData[currentWeek - 1][selectedDayIndex][tab];
        const block = (blockIndex === undefined || blockIndex === 0)
            ? dayData
            : dayData.extraBlocks[blockIndex - 1];

        const context = `[${tab.toUpperCase()}] ${block.format} - ${block.headline}\nIntenção: ${block.intention}\nInstrução: ${block.instruction}`;
        sessionStorage.setItem("ai_assistant_context", context);
        window.location.href = "/assistant";
    };

    const handleAddExtraBlock = (tab: DetailTab) => {
        const newData = JSON.parse(JSON.stringify(weeklyData));
        if (!newData[currentWeek - 1]) newData[currentWeek - 1] = {};
        if (!newData[currentWeek - 1][selectedDayIndex]) newData[currentWeek - 1][selectedDayIndex] = { feed: {}, stories: {} };
        const day = newData[currentWeek - 1][selectedDayIndex][tab];
        if (!day.extraBlocks) day.extraBlocks = [];

        day.extraBlocks.push({
            headline: "",
            format: tab === "feed" ? "Carrossel" : "Sequência",
            intention: "Conexão",
            instruction: "Crie um tema complementar.",
            notes: "",
            id: Date.now()
        });
        setWeeklyData(newData);
        isDirty.current = true;
        toast.info("Novo tema adicionado!");
    };

    const handleRemoveBlock = (tab: DetailTab, blockIndex: number) => {
        if (blockIndex === 0) {
            toast.error("O bloco principal não pode ser removido. Use 'Limpar' se desejar.");
            return;
        }
        const newData = JSON.parse(JSON.stringify(weeklyData));
        const day = newData[currentWeek - 1][selectedDayIndex][tab];
        day.extraBlocks.splice(blockIndex - 1, 1);
        setWeeklyData(newData);
        isDirty.current = true;
        toast.success("Tema removido!");
    };

    const handleClearWeek = async () => {
        if (!confirm(`Deseja realmente apagar TODO o conteúdo da Semana ${currentWeek}?`)) return;
        const newData = JSON.parse(JSON.stringify(weeklyData));
        newData[currentWeek - 1] = {};
        setWeeklyData(newData);
        await updateBrand.mutateAsync({ updates: { weekly_structure_data: newData } });
        toast.success(`Conteúdo da Semana ${currentWeek} apagado!`);
    };

    const handleClearAll = async () => {
        if (!confirm("Deseja realmente apagar o conteúdo de TODAS as 4 semanas?")) return;
        setWeeklyData({});
        await updateBrand.mutateAsync({ updates: { weekly_structure_data: {} } });
        toast.success("Todo o planejamento foi apagado!");
    };

    const handleGenerateIntentions = async () => {
        const toastId = toast.loading("IA analisando marca e traçando jornada semanal...");
        setIsGeneratingIntentions(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value?.trim();
            if (!apiKey) throw new Error("API Key não configurada");

            const prompt = `Você é um Estrategista de Branding e Conteúdo.
      OBJETIVO: Definir a "Intenção Principal" para cada dia da semana (Domingo a Sábado) para uma marca.
      
      OPÇÕES DE INTENÇÃO (Escolha APENAS estas): ${INTENTION_OPTIONS.join(", ")}.
      
      MARCA:
      Nome: ${brand?.name}
      Setor: ${brand?.sector}
      DNA/Tese: ${brand?.dna_tese}
      Essência/Personalidade: ${brand?.result_essencia}
      
      REGRAS:
      1. Distribua as intenções de forma estratégica ao longo da semana.
      2. Foque em criar uma jornada de valor para o seguidor (Educação -> Conexão -> Venda, etc).
      3. O resultado deve ser um objeto JSON onde as chaves são os dias da semana (Domingo, Segunda, Terça, Quarta, Quinta, Sexta, Sábado) e os valores são as intenções escolhidas.
      
      SAÍDA EXCLUSIVAMENTE EM JSON.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Expert em estratégia de conteúdo. Saída sempre em JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            const result = JSON.parse(data.choices[0].message.content);

            // Validar e aplicar
            const newPrefs = { ...(routineData.routine_intentions_prefs || {}) };
            DAYS_OF_WEEK.forEach(day => {
                if (result[day] && INTENTION_OPTIONS.includes(result[day])) {
                    newPrefs[day] = result[day];
                }
            });

            handleRoutineChange("routine_intentions_prefs", newPrefs);
            toast.success("Intenções geradas com estratégia de IA!", { id: toastId });
        } catch (error: any) {
            toast.error("Erro ao gerar intenções: " + error.message, { id: toastId });
        } finally {
            setIsGeneratingIntentions(false);
        }
    };

    const handleClearTab = (tab: DetailTab) => {
        if (!confirm(`Deseja limpar os campos de ${tab.toUpperCase()} deste dia?`)) return;
        const newData = JSON.parse(JSON.stringify(weeklyData));
        if (newData[currentWeek - 1]?.[selectedDayIndex]?.[tab]) {
            newData[currentWeek - 1][selectedDayIndex][tab] = {};
            setWeeklyData(newData);
            toast.success(`${tab.toUpperCase()} limpo com sucesso!`);
        }
    };

    const handleSaveToAgenda = async (tab: DetailTab, blockIndex?: number) => {
        if (!user) {
            toast.error("Usuário não autenticado");
            return;
        }

        const dayData = weeklyData[currentWeek - 1][selectedDayIndex][tab];
        const block = (blockIndex === undefined || blockIndex === 0)
            ? dayData
            : dayData.extraBlocks[blockIndex - 1];

        if (!block.headline) {
            toast.error("Adicione um título/tema antes de salvar na agenda.");
            return;
        }

        // Calcular data correta
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? -6 : 1 - currentDay;
        const mondayOfWeek1 = new Date(today);
        mondayOfWeek1.setDate(today.getDate() + diff);
        const targetDate = new Date(mondayOfWeek1);
        targetDate.setDate(mondayOfWeek1.getDate() + (currentWeek - 1) * 7 + (selectedDayIndex === 0 ? 6 : selectedDayIndex - 1));

        const eventData = {
            titulo: `${tab === 'feed' ? '[FEED]' : '[STORIES]'} ${block.headline}`,
            categoria: "Conteúdo",
            tipo: "Tarefa",
            data: format(targetDate, "yyyy-MM-dd"),
            hora: block.time || "09:00",
            duracao: 60,
            status: "Pendente",
            user_id: user.id,
            descricao: `Formato: ${block.format || '-'}\nIntenção: ${block.intention || '-'}\nLink: ${block.link || '-'}\n\nNotas:\n${block.notes || ''}`
        };

        try {
            const { error } = await (supabase as any)
                .from("eventos_do_cerebro")
                .insert(eventData);

            if (error) throw error;
            toast.success("Tarefa salva na agenda com sucesso!");
        } catch (error: any) {
            console.error("Erro ao salvar na agenda:", error);
            toast.error("Erro ao salvar na agenda.");
        }
    };

    const cleanTextForPDF = (text: string) => {
        if (!text) return "";
        return text
            .replace(/\*\*/g, "") // Remove bold markdown
            .replace(/###/g, "") // Remove h3 heading markdown
            .replace(/---/g, "") // Remove horizontal line markdown
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "") // Remove most common emojis
            .trim();
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        let yPos = 20;
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        const lineHeight = 7;

        // Título Principal
        doc.setFontSize(22);
        doc.setTextColor(150, 0, 150);
        doc.setFont("helvetica", "bold");
        doc.text("Planejamento Semanal YAh", margin, yPos);
        yPos += 15;

        let contentFound = false;

        for (let weekIdx = 0; weekIdx < 4; weekIdx++) {
            const weekData = weeklyData[weekIdx];
            if (!weekData || Object.keys(weekData).length === 0) continue;

            contentFound = true;
            // Garantir que cada semana comece em uma nova página (exceto a primeira se houver espaço)
            if (weekIdx > 0) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(20);
            doc.setTextColor(150, 0, 150);
            doc.setFont("helvetica", "bold");
            doc.text(`SEMANA ${weekIdx + 1}`, margin, yPos);
            yPos += 5;
            doc.setDrawColor(150, 0, 150);
            doc.setLineWidth(0.5);
            doc.line(margin, yPos, margin + 40, yPos); // Linha decorativa
            yPos += 15;
            doc.setTextColor(0, 0, 0);

            for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
                const day = weekData[dayIdx];
                if (!day || (!day.feed?.headline && !day.stories?.headline)) continue;

                // Verificar espaço para o dia
                if (yPos > doc.internal.pageSize.getHeight() - 40) {
                    doc.addPage();
                    yPos = 20;
                }

                // Cabeçalho do Dia
                doc.setFontSize(14);
                doc.setTextColor(60, 60, 60);
                doc.setFont("helvetica", "bold");
                const dateText = `${DAYS_OF_WEEK[dayIdx].toUpperCase()} • ${getPostDate(weekIdx + 1, dayIdx)}`;
                doc.text(dateText, margin, yPos);
                yPos += 3;
                doc.setDrawColor(230, 230, 230);
                doc.line(margin, yPos, pageWidth - margin, yPos); // Separador de dia
                yPos += 10;
                doc.setTextColor(0, 0, 0);

                // Feed
                const feedBlocks = [day.feed, ...(day.feed?.extraBlocks || [])].filter(b => b?.headline || b?.notes);
                for (const block of feedBlocks) {
                    doc.setFontSize(11);
                    doc.setTextColor(100, 100, 100);
                    doc.setFont("helvetica", "bold");
                    doc.text("FEED", margin + 5, yPos);
                    yPos += 6;
                    doc.setTextColor(0, 0, 0);

                    if (block.headline) {
                        const cleanHeadline = cleanTextForPDF(block.headline);
                        doc.setFont("helvetica", "bold");
                        doc.text(`TEMA: ${cleanHeadline}`, margin + 5, yPos);
                        yPos += lineHeight;
                    }

                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text(`Formato: ${block.format || '-'} | Intenção: ${block.intention || '-'}`, margin + 5, yPos);
                    yPos += lineHeight + 2;

                    if (block.notes) {
                        doc.setFontSize(11);
                        const cleanNotes = cleanTextForPDF(block.notes);
                        const splitNotes = doc.splitTextToSize(cleanNotes, contentWidth - 10);

                        if (yPos + (splitNotes.length * lineHeight) > doc.internal.pageSize.getHeight() - margin) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.text(splitNotes, margin + 5, yPos);
                        yPos += (splitNotes.length * lineHeight) + 5;
                    }
                    yPos += 5;
                }

                // Stories
                const storiesBlocks = [day.stories, ...(day.stories?.extraBlocks || [])].filter(b => b?.headline || b?.notes);
                for (const block of storiesBlocks) {
                    if (yPos > doc.internal.pageSize.getHeight() - 30) {
                        doc.addPage();
                        yPos = 20;
                    }

                    doc.setFontSize(11);
                    doc.setTextColor(200, 0, 150);
                    doc.setFont("helvetica", "bold");
                    doc.text("STORIES", margin + 5, yPos);
                    yPos += 6;
                    doc.setTextColor(0, 0, 0);

                    if (block.headline) {
                        const cleanHeadline = cleanTextForPDF(block.headline);
                        doc.setFont("helvetica", "bold");
                        doc.text(`GANCHO: ${cleanHeadline}`, margin + 5, yPos);
                        yPos += lineHeight;
                    }

                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text(`Formato: ${block.format || '-'} | Objetivo: ${block.intention || '-'}`, margin + 5, yPos);
                    yPos += lineHeight + 2;

                    if (block.notes) {
                        doc.setFontSize(11);
                        const cleanNotes = cleanTextForPDF(block.notes);
                        const splitNotes = doc.splitTextToSize(cleanNotes, contentWidth - 10);

                        if (yPos + (splitNotes.length * lineHeight) > doc.internal.pageSize.getHeight() - margin) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.text(splitNotes, margin + 5, yPos);
                        yPos += (splitNotes.length * lineHeight) + 5;
                    }
                    yPos += 10;
                }

                yPos += 5; // Espaço extra após o dia
            }
        }

        if (!contentFound) {
            toast.error("Nenhum conteúdo encontrado para exportar.");
            return;
        }

        doc.save("YAh_Planejamento_Semanal.pdf");
        toast.success("PDF exportado com sucesso!");
    };
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollAmount = container.offsetWidth > 768 ? 340 : (window.innerWidth - 48 + 16);

            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'done': return 'bg-green-500';
            case 'in_progress': return 'bg-yellow-500';
            case 'skipped': return 'bg-red-500';
            default: return 'bg-slate-300';
        }
    };

    const getPostDate = (weekNum: number, dayIdx: number) => {
        const today = new Date();
        const mondayOfThisWeek = new Date(today);
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? -6 : 1 - currentDay; // Ajuste para Segunda
        mondayOfThisWeek.setDate(today.getDate() + diff);

        const targetDate = new Date(mondayOfThisWeek);
        targetDate.setDate(mondayOfThisWeek.getDate() + (weekNum - 1) * 7 + (dayIdx === 0 ? 6 : dayIdx - 1));

        return targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;

        // Calcular a segunda-feira da semana atual (Semana 1)
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? -6 : 1 - currentDay; // Ajuste para Segunda
        const mondayOfWeek1 = new Date(today);
        mondayOfWeek1.setDate(today.getDate() + diff);
        mondayOfWeek1.setHours(0, 0, 0, 0); // Zerar horas para comparação justa

        // Calcular a diferença em dias
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        const diffDays = differenceInCalendarDays(selectedDate, mondayOfWeek1);

        // Calcular nova semana e dia
        const newWeekIndex = Math.floor(diffDays / 7); // 0 a 3 para 4 semanas
        const newWeekNum = newWeekIndex + 1;

        // Validação: permitir apenas dentro das 4 semanas projetadas
        if (newWeekNum < 1 || newWeekNum > 4) {
            toast.error("Por favor, selecione uma data dentro das próximas 4 semanas.");
            return;
        }

        const newDayIdx = selectedDate.getDay(); // 0 = Domingo, 1 = Segunda, etc.

        // Mover o conteúdo
        const oldContent = weeklyData[currentWeek - 1]?.[selectedDayIndex] || {};

        // Clonar dados
        const newWeeklyData = { ...weeklyData };

        // Inicializar estruturas se não existirem
        if (!newWeeklyData[newWeekIndex]) newWeeklyData[newWeekIndex] = {};
        if (!newWeeklyData[newWeekIndex][newDayIdx]) newWeeklyData[newWeekIndex][newDayIdx] = { feed: {}, stories: {} };

        // Copiar conteúdo para o novo dia
        newWeeklyData[newWeekIndex][newDayIdx] = {
            ...newWeeklyData[newWeekIndex][newDayIdx],
            [detailTab]: oldContent[detailTab]
        };

        // Limpar o conteúdo do dia original
        if (newWeeklyData[currentWeek - 1] && newWeeklyData[currentWeek - 1][selectedDayIndex]) {
            newWeeklyData[currentWeek - 1][selectedDayIndex][detailTab] = {};
        }

        setWeeklyData(newWeeklyData);
        setCurrentWeek(newWeekNum);
        setSelectedDayIndex(newDayIdx);

        toast.success(`Postagem movida para ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`);
    };

    const renderVision = () => {
        const weekData = weeklyData[currentWeek - 1] || {};
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl md:text-2xl font-bold">Estrutura fixa semanal</h2>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-background/50 border-border hover:bg-white/5 h-8">
                                    Semana {currentWeek} <ChevronLeft className="w-4 h-4 ml-1 rotate-[-90deg]" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {[1, 2, 3, 4].map(w => (
                                    <DropdownMenuItem key={w} onClick={() => setCurrentWeek(w)}>
                                        Semana {w}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setScreen("routine")} className="h-8 text-[10px] md:text-xs px-2">
                            <Settings className="w-3.5 h-3.5 mr-1" /> Rotina
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setScreen("monthly")} className="h-8 text-[10px] md:text-xs px-2">
                            <Table className="w-3.5 h-3.5 mr-1" /> 30 Dias
                        </Button>
                    </div>

                </div>


                <div className="relative group">
                    {/* Botões de navegação para mobile - Agora com Voltar e Avançar */}


                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
                        onClick={() => scroll('left')}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>

                    <div
                        ref={scrollContainerRef}
                        className="flex gap-4 overflow-x-auto pb-4 pt-2 scroll-smooth snap-x snap-mandatory px-6 md:px-2 custom-scrollbar"
                    >
                        {DAYS_OF_WEEK.map((day, idx) => {
                            const dayContent = weekData[idx] || { feed: {}, stories: {} };
                            const isToday = new Date().getDay() === idx;
                            return (
                                <div key={day} className="min-w-[calc(100vw-72px)] md:min-w-[320px] snap-center">
                                    <Card className={cn(
                                        "h-full border-border bg-card/40 backdrop-blur-sm transition-all",
                                        isToday && "ring-2 ring-accent/20 border-accent/30"
                                    )}>
                                        <CardHeader className="p-3 md:p-4 pb-2">
                                            <div className="flex justify-between items-center">
                                                <span className={cn("text-xs font-bold uppercase tracking-wider", isToday ? "text-accent" : "text-muted-foreground")}>
                                                    {isToday ? "Hoje — " : ""}{day}
                                                </span>
                                                <div className={cn("w-2 h-2 rounded-full", getStatusColor(dayContent.feed?.status || 'planned'))} />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-3 md:p-4 pt-0 space-y-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="p-4 rounded-xl bg-background/60 hover:bg-white/5 cursor-pointer border border-white/5 hover:border-accent/50 transition-all space-y-2 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.5),offset-x_0_1px_rgba(255,255,255,0.05)_inset] hover:translate-y-[-2px] active:translate-y-[0px]"
                                                    onClick={() => { setSelectedDayIndex(idx); setDetailTab("feed"); setScreen("detail"); }}>
                                                    <div className="flex flex-wrap items-center justify-between gap-y-2">
                                                        <span className="text-[10px] font-bold flex items-center gap-1.5 opacity-80"><Instagram className="w-3 h-3 text-pink-500" /> FEED</span>
                                                        <div className="flex gap-1">
                                                            <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[9px] font-black uppercase ring-1 ring-accent/30">{dayContent.feed?.format || '---'}</span>
                                                            {(dayContent.feed?.extraBlocks?.length || 0) > 0 && (
                                                                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-bold">+{dayContent.feed.extraBlocks.length}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-bold line-clamp-2 leading-tight text-white/90">{dayContent.feed?.headline || 'Título da IA...'}</p>
                                                </div>
                                                <div className="p-4 rounded-xl bg-background/60 hover:bg-white/5 cursor-pointer border border-white/5 hover:border-accent/50 transition-all space-y-2 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.5),offset-x_0_1px_rgba(255,255,255,0.05)_inset] hover:translate-y-[-2px] active:translate-y-[0px]"
                                                    onClick={() => { setSelectedDayIndex(idx); setDetailTab("stories"); setScreen("detail"); }}>
                                                    <div className="flex flex-wrap items-center justify-between gap-y-2">
                                                        <span className="text-[10px] font-bold flex items-center gap-1.5 opacity-80"><MessageSquare className="w-3 h-3 text-orange-400" /> STORIES</span>
                                                        <div className="flex gap-1">
                                                            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-black uppercase ring-1 ring-primary/30">{dayContent.stories?.format || '---'}</span>
                                                            {(dayContent.stories?.extraBlocks?.length || 0) > 0 && (
                                                                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-bold">+{dayContent.stories.extraBlocks.length}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-bold line-clamp-2 leading-tight text-white/90">{dayContent.stories?.headline || 'Headline Stories...'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })}
                    </div>

                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
                        onClick={() => scroll('right')}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-4 pb-16">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] md:text-xs text-muted-foreground hover:text-destructive px-2">
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={handleClearWeek} className="text-destructive focus:text-destructive">
                                Apagar Semana {currentWeek}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleClearAll} className="text-destructive focus:text-destructive font-bold">
                                Apagar Tudo (4 Semanas)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-8 text-[10px] md:text-xs border-accent/40 hover:bg-accent/5 px-2">
                        <Book className="w-3.5 h-3.5 mr-1 text-accent" /> Exportar PDF
                    </Button>
                </div>

                {/* Botões de navegação para mobile - Agora com Voltar e Avançar */}
                <div className="relative flex justify-center gap-8 mt-6 pb-8 md:hidden">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="w-14 h-14 rounded-full shadow-2xl bg-background text-accent border-2 border-accent/20 pointer-events-auto shadow-black/20 active:scale-95 transition-all text-accent"
                        onClick={() => scroll('left')}
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="w-14 h-14 rounded-full shadow-2xl bg-accent text-white border-none animate-pulse pointer-events-auto shadow-accent/40 active:scale-95 transition-all"
                        onClick={() => scroll('right')}
                    >
                        <ChevronRight className="w-8 h-8" />
                    </Button>
                </div>
            </div>
        );
    };

    const renderRoutine = () => {
        return (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto relative">
                {isGenerating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#1E1E1E] border border-[#B6BC45]/30 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6 mx-4 animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#B6BC45]/20 blur-xl rounded-full" />
                                <Loader2 className="w-16 h-16 text-[#B6BC45] animate-spin mx-auto relative z-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-[#EEEDE9]">Gerando sua estrutura de 4 semanas...</h3>
                                <p className="text-sm text-[#999] leading-relaxed">
                                    Por favor, <span className="text-[#B6BC45] font-semibold">não saia desta tela ou feche o app</span> para garantir que tudo seja gerado corretamente.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="space-y-2">
                    <Button variant="ghost" size="sm" onClick={() => setScreen("vision")} className="mb-2">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                    </Button>
                    <h2 className="text-2xl font-bold">Sua rotina semanal</h2>
                    <p className="text-muted-foreground text-sm">Ajuste como a YAh deve organizar sua agenda.</p>
                </div>
                <div className="space-y-6">
                    <Card className="bg-card/50 border-border">
                        <CardHeader><CardTitle className="text-base">1. Frequência</CardTitle></CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <Label>Posts por semana</Label>
                                <div className="grid grid-cols-3 gap-2 md:gap-4">
                                    {[3, 5, 7].map(num => (
                                        <Button key={num} variant={routineData.routine_posts_per_week === num ? "default" : "outline"}
                                            onClick={() => handleRoutineChange("routine_posts_per_week", num)} className="w-full text-xs md:text-sm px-1">
                                            {num} dias
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Dias de Postagem (Frequência: {routineData.routine_posts_per_week} posts/semana)</Label>
                                <p className="text-[10px] text-muted-foreground italic -mt-2">Selecione exatamente os dias em que deseja postar.</p>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <div key={day} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-background/50 border border-border">
                                            <Checkbox
                                                id={`post-${day}`}
                                                checked={routineData.routine_posting_days?.includes(day)}
                                                onCheckedChange={(checked) => {
                                                    const current = routineData.routine_posting_days || [];
                                                    if (checked) {
                                                        if (current.length >= (routineData.routine_posts_per_week || 7)) {
                                                            toast.error(`Você já selecionou o limite de ${routineData.routine_posts_per_week} dias.`);
                                                            return;
                                                        }
                                                        handleRoutineChange("routine_posting_days", [...current, day]);
                                                    } else {
                                                        handleRoutineChange("routine_posting_days", current.filter(d => d !== day));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`post-${day}`} className="text-[10px] uppercase font-bold cursor-pointer opacity-70">{day.substring(0, 3)}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Dias para criar roteiros (planejar)</Label>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <div key={day} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-background/50 border border-border">
                                            <Checkbox
                                                id={`plan-${day}`}
                                                checked={routineData.routine_planning_days?.includes(day)}
                                                onCheckedChange={(checked) => {
                                                    const current = routineData.routine_planning_days || [];
                                                    if (checked) handleRoutineChange("routine_planning_days", [...current, day]);
                                                    else handleRoutineChange("routine_planning_days", current.filter(d => d !== day));
                                                }}
                                            />
                                            <Label htmlFor={`plan-${day}`} className="text-[10px] uppercase font-bold cursor-pointer opacity-70">{day.substring(0, 3)}</Label>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2 text-xs border-dashed text-muted-foreground hover:text-accent hover:border-accent"
                                    onClick={() => handleSendRoutineToAgenda("planning", routineData.routine_planning_days || [])}
                                >
                                    <CalendarIcon className="w-3 h-3 mr-2" />
                                    Enviar para agenda (Criar toda semana)
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <Label>Dias para gravar/executar</Label>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <div key={day} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-background/50 border border-border">
                                            <Checkbox
                                                id={`exec-${day}`}
                                                checked={routineData.routine_execution_days?.includes(day)}
                                                onCheckedChange={(checked) => {
                                                    const current = routineData.routine_execution_days || [];
                                                    if (checked) handleRoutineChange("routine_execution_days", [...current, day]);
                                                    else handleRoutineChange("routine_execution_days", current.filter(d => d !== day));
                                                }}
                                            />
                                            <Label htmlFor={`exec-${day}`} className="text-[10px] uppercase font-bold cursor-pointer opacity-70">{day.substring(0, 3)}</Label>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2 text-xs border-dashed text-muted-foreground hover:text-accent hover:border-accent"
                                    onClick={() => handleSendRoutineToAgenda("execution", routineData.routine_execution_days || [])}
                                >
                                    <CalendarIcon className="w-3 h-3 mr-2" />
                                    Enviar para agenda (Criar toda semana)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border overflow-hidden">
                        <CardHeader className="bg-muted/30">
                            <CardTitle className="text-base">2. Preferências por Dia (Feed)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {DAYS_OF_WEEK.map(day => (
                                    <div key={day} className="p-4 grid grid-cols-2 gap-4 items-center">
                                        <span className="text-sm font-medium">{day}</span>
                                        <Select
                                            value={routineData.routine_feed_format_prefs?.[day] || "Alternar"}
                                            onValueChange={(val) => {
                                                const prefs = { ...(routineData.routine_feed_format_prefs || {}), [day]: val };
                                                handleRoutineChange("routine_feed_format_prefs", prefs);
                                            }}
                                        >
                                            <SelectTrigger className="h-8 text-xs bg-background/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FEED_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border overflow-hidden">
                        <CardHeader className="bg-muted/30">
                            <CardTitle className="text-base">3. Horários Fixos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <p className="text-xs text-muted-foreground">Você tem horários ocupados? A YAh evitará sugerir tarefas nesses períodos.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {["08h-12h", "13h-18h", "18h-22h"].map(block => (
                                    <Button
                                        key={block}
                                        variant={routineData.routine_fixed_hours?.includes(block) ? "default" : "outline"}
                                        onClick={() => {
                                            const current = routineData.routine_fixed_hours || [];
                                            if (current.includes(block)) handleRoutineChange("routine_fixed_hours", current.filter(b => b !== block));
                                            else handleRoutineChange("routine_fixed_hours", [...current, block]);
                                        }}
                                        className="text-xs py-5 md:py-6 h-auto flex flex-col md:flex-row gap-2"
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{block}</span>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border overflow-hidden">
                        <CardHeader className="bg-muted/30 flex flex-row items-center justify-between">
                            <CardTitle className="text-base">4. Intenção Principal por Dia</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] font-bold uppercase gap-1.5 border-accent/30 hover:bg-accent/5"
                                onClick={handleGenerateIntentions}
                                disabled={isGeneratingIntentions}
                            >
                                {isGeneratingIntentions ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3 h-3 text-accent" />
                                )}
                                {isGeneratingIntentions ? "Gerando..." : "Gerar com IA"}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {DAYS_OF_WEEK.map(day => (
                                    <div key={day} className="p-4 grid grid-cols-2 gap-4 items-center">
                                        <span className="text-sm font-medium">{day}</span>
                                        <Select
                                            value={routineData.routine_intentions_prefs?.[day] || "Conexão"}
                                            onValueChange={(val) => {
                                                const prefs = { ...(routineData.routine_intentions_prefs || {}), [day]: val };
                                                handleRoutineChange("routine_intentions_prefs", prefs);
                                            }}
                                        >
                                            <SelectTrigger className="h-8 text-xs bg-background/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {INTENTION_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <Button size="lg" className="w-full gradient-primary" onClick={generateWeeklyStructure} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Gerar Estrutura 4 Semanas
                    </Button>
                </div>

                <AlertDialog open={routineConfirmation.isOpen} onOpenChange={(open) => !open && setRoutineConfirmation({ isOpen: false, type: null, days: [] })}>
                    <AlertDialogContent className="bg-slate-950 border-border">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Confirmar Agendamento Recorrente</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                                Você está prestes a criar uma tarefa RECORRENTE que se repetirá toda semana nos dias: <br />
                                <span className="font-bold text-accent">{routineConfirmation.days.join(", ")}</span>.
                                <br /><br />
                                Deseja confirmar o agendamento de <span className="font-bold text-white">{routineConfirmation.type === "planning" ? "Criação de Roteiros" : "Gravação/Execução"}</span>?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent text-white border-white/20 hover:bg-white/10">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={executeSendRoutineToAgenda} className="bg-accent text-white hover:bg-accent/90">Confirmar Agendamento</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    };

    const renderMonthly = () => {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setScreen("vision")}><ChevronLeft className="w-4 h-4 mr-1" /> Voltar</Button>
                    <h2 className="text-2xl font-bold">Modo 30 Dias</h2>
                    <div className="w-20" />
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, weekIdx) => (
                        <div key={weekIdx} className="space-y-2">
                            <h3 className="text-sm font-bold text-muted-foreground/80">Semana {weekIdx + 1}</h3>
                            {DAYS_OF_WEEK.map((day, dayIdx) => {
                                const dayData = weeklyData[weekIdx]?.[dayIdx] || { feed: {} };
                                const hasContent = !!dayData.feed?.headline;
                                return (
                                    <div key={day} className={cn(
                                        "flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all",
                                        hasContent
                                            ? "bg-accent/20 border-accent/40 text-foreground ring-1 ring-accent/10"
                                            : "bg-card/40 border-border text-muted-foreground/50 opacity-60"
                                    )}
                                        onClick={() => { setCurrentWeek(weekIdx + 1); setSelectedDayIndex(dayIdx); setDetailTab("feed"); setScreen("detail"); }}>
                                        <div className={cn(
                                            "w-12 text-[10px] font-bold uppercase",
                                            hasContent ? "text-accent" : "text-muted-foreground/60"
                                        )}>{day.substring(0, 3)}</div>
                                        <div className={cn(
                                            "flex-1 text-sm font-semibold",
                                            hasContent ? "text-foreground" : "text-muted-foreground/40"
                                        )}>{dayData.feed?.headline || "Sem conteúdo"}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderDetail = () => {
        const dayData = weeklyData[currentWeek - 1]?.[selectedDayIndex] || { feed: {}, stories: {} };
        const blocks = [dayData[detailTab], ...(dayData[detailTab]?.extraBlocks || [])];

        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setScreen("vision")}><ChevronLeft className="w-4 h-4 mr-1" /> Voltar</Button>
                    <div className="text-center">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase mb-1 tracking-widest">
                            {detailTab === 'feed' ? <Instagram className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                            {detailTab}
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-widest">{DAYS_OF_WEEK[selectedDayIndex]}</h3>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent text-[10px] text-muted-foreground uppercase font-normal hover:text-accent transition-colors">
                                    {getPostDate(currentWeek, selectedDayIndex)} • Semana {currentWeek}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
                                <Calendar
                                    mode="single"
                                    selected={(() => {
                                        // Reconstruir a data atual selecionada para mostrar no calendário
                                        const today = new Date();
                                        const currentDay = today.getDay();
                                        const diff = currentDay === 0 ? -6 : 1 - currentDay;
                                        const monday = new Date(today);
                                        monday.setDate(today.getDate() + diff);
                                        const target = new Date(monday);
                                        target.setDate(monday.getDate() + (currentWeek - 1) * 7 + (selectedDayIndex === 0 ? 6 : selectedDayIndex - 1));
                                        return target;
                                    })()}
                                    onSelect={handleDateSelect}
                                    initialFocus
                                    locale={ptBR}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => saveWeeklyData()} className="text-accent"><Save className="w-4 h-4 mr-1" /> Salvar</Button>
                </div>

                <div className="space-y-8">
                    {blocks.map((block, bIdx) => (
                        <Card key={bIdx === 0 ? 'main' : (block.id || bIdx)} className="bg-card/30 border-border overflow-hidden relative">
                            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-black text-accent">
                                        {bIdx + 1}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {bIdx === 0 ? "Tema Principal" : "Tema Complementar"}
                                    </span>
                                </div>
                                {bIdx > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemoveBlock(detailTab, bIdx)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-4">

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Título / Tema</Label>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleGenerateHeadline(detailTab, bIdx)}
                                                disabled={isGeneratingHeadline}
                                                className="h-5 px-2 text-[9px] text-accent hover:text-accent hover:bg-accent/10"
                                            >
                                                {isGeneratingHeadline ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                                {isGeneratingHeadline ? "Gerando..." : "Sugerir Opção"}
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder={detailTab === 'feed' ? "Título do post..." : "Micro-headline / Gancho..."}
                                            value={block.headline || ""}
                                            onChange={(e) => handleDataChange(detailTab, "headline", e.target.value, bIdx)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Formato</Label>
                                            <Select
                                                value={block.format || (detailTab === 'feed' ? "Carrossel" : "Sequência")}
                                                onValueChange={(val) => handleDataChange(detailTab, "format", val, bIdx)}
                                            >
                                                <SelectTrigger className="h-9 bg-background/50"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {(detailTab === 'feed' ? FEED_FORMATS : STORIES_FORMATS).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Intenção</Label>
                                            <Select
                                                value={block.intention || "Conexão"}
                                                onValueChange={(val) => handleDataChange(detailTab, "intention", val, bIdx)}
                                            >
                                                <SelectTrigger className="h-9 bg-background/50"><SelectValue /></SelectTrigger>
                                                <SelectContent>{INTENTION_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-[100px_1fr] gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Horário</Label>
                                            <Input
                                                type="time"
                                                className="h-9 bg-background/50 text-center px-0"
                                                value={block.time || ""}
                                                onChange={(e) => handleDataChange(detailTab, "time", e.target.value, bIdx)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5"><Link className="w-3 h-3" /> Link / Ref</Label>
                                            <Input
                                                placeholder="https://..."
                                                className="h-9 bg-background/50"
                                                value={block.link || ""}
                                                onChange={(e) => handleDataChange(detailTab, "link", e.target.value, bIdx)}
                                            />
                                        </div>
                                    </div>



                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Roteiro / Conteúdo</Label>
                                            <span className="text-[9px] text-muted-foreground">{block.notes?.length || 0} caracteres</span>
                                        </div>
                                        <div className="relative">
                                            {isWritingScript && adjustingBlock?.index === bIdx && adjustingBlock?.tab === detailTab && (
                                                <div className="absolute inset-0 bg-accent/5 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center animate-in fade-in duration-300 rounded-lg">
                                                    <Loader2 className="w-6 h-6 text-accent animate-spin mb-2" />
                                                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest text-center px-4">Yah está escrevendo seu roteiro estrategicamente...</span>
                                                </div>
                                            )}
                                            <Textarea
                                                placeholder="Descreve aqui o roteiro detalhado..."
                                                className="min-h-[160px] bg-background/40 resize-none text-sm leading-relaxed"
                                                value={block.notes || ""}
                                                onChange={(e) => handleDataChange(detailTab, "notes", e.target.value, bIdx)}
                                            />
                                        </div>
                                    </div>

                                    {detailTab === 'feed' && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Legenda do Post</Label>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleWriteCaption(detailTab, bIdx)}
                                                        disabled={isWritingCaption}
                                                        className="h-6 px-2 text-[10px] text-accent hover:text-accent hover:bg-accent/10"
                                                    >
                                                        {isWritingCaption ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                                        {isWritingCaption ? "Gerando..." : "Sugerir Legenda"}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                {isWritingCaption && (
                                                    <div className="absolute inset-0 bg-accent/5 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center animate-in fade-in duration-300 rounded-lg">
                                                        <Loader2 className="w-5 h-5 text-accent animate-spin mb-2" />
                                                        <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Criando legenda persuasiva...</span>
                                                    </div>
                                                )}
                                                <Textarea
                                                    placeholder="Escreva ou gere a legenda aqui..."
                                                    className="min-h-[100px] bg-background/40 resize-none text-sm leading-relaxed"
                                                    value={block.caption || ""}
                                                    onChange={(e) => handleDataChange(detailTab, "caption", e.target.value, bIdx)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3 pt-2">
                                        {block.notes && adjustingBlock?.index === bIdx && adjustingBlock?.tab === detailTab ? (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Textarea
                                                    placeholder="O que deseja mudar? (ex: 'mais curto', 'mais humor', 'foco em vendas')"
                                                    className="min-h-[80px] bg-accent/5 border-accent/30 text-xs"
                                                    value={adjustmentText}
                                                    onChange={(e) => setAdjustmentText(e.target.value)}
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 h-8 text-[10px]"
                                                        onClick={() => handleWriteScript(detailTab, bIdx, adjustmentText)}
                                                        disabled={isWritingScript || !adjustmentText}
                                                    >
                                                        {isWritingScript ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Wand2 className="w-3 h-3 mr-2" />}
                                                        Aplicar Ajuste
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-[10px]"
                                                        onClick={() => setAdjustingBlock(null)}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (block.notes) {
                                                            setAdjustingBlock({ tab: detailTab, index: bIdx || 0 });
                                                        } else {
                                                            handleWriteScript(detailTab, bIdx);
                                                        }
                                                    }}
                                                    disabled={isWritingScript || isGenerating}
                                                    className={cn(
                                                        "h-10 text-xs font-bold border-accent/30 hover:bg-accent/5",
                                                        !block.notes && "border-accent/60 bg-accent/5"
                                                    )}
                                                >
                                                    {isWritingScript ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : (block.notes ? <Settings className="w-3.5 h-3.5 mr-2 text-accent" /> : <Sparkles className="w-3.5 h-3.5 mr-2 text-accent" />)}
                                                    {isWritingScript ? "Processando..." : (block.notes ? "Ajustar Roteiro" : "Sugerir Roteiro")}
                                                </Button>
                                                <Button
                                                    className="bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 h-10 text-xs font-bold"
                                                    onClick={() => handleSaveToAgenda(detailTab, bIdx)}
                                                >
                                                    <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                                                    Salvar na Agenda
                                                </Button>
                                                <Button
                                                    className="bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 h-10 text-xs font-bold col-span-2"
                                                    onClick={() => handleExportWhatsApp(detailTab, bIdx)}
                                                >
                                                    <Share2 className="w-3.5 h-3.5 mr-2" />
                                                    Exportar para WhatsApp
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <div className="flex flex-col gap-4 py-4">
                        <Button
                            variant="outline"
                            className="w-full h-14 border-dashed border-2 border-accent/30 hover:border-accent hover:bg-accent/5 flex flex-col items-center justify-center gap-0.5"
                            onClick={() => handleAddExtraBlock(detailTab)}
                        >
                            <div className="flex items-center gap-2 text-accent">
                                <Plus className="w-4 h-4" />
                                <span className="font-bold">Adicionar Novo Tema</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 uppercase">Crie mais um conteúdo complementar</span>
                        </Button>

                        <div className="h-px bg-border my-2" />

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClearTab(detailTab)}
                            className="text-destructive/50 hover:text-destructive hover:bg-destructive/5 self-center text-xs"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Limpar {detailTab === 'feed' ? 'Feed' : 'Stories'} deste dia
                        </Button>
                    </div>
                </div>

                <AlertDialog open={routineConfirmation.isOpen} onOpenChange={(open) => !open && setRoutineConfirmation({ isOpen: false, type: null, days: [] })}>
                    <AlertDialogContent className="bg-slate-950 border-border">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Confirmar Agendamento Recorrente</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                                Você está prestes a criar uma tarefa RECORRENTE que se repetirá toda semana nos dias: <br />
                                <span className="font-bold text-accent">{routineConfirmation.days.join(", ")}</span>.
                                <br /><br />
                                Deseja confirmar o agendamento de <span className="font-bold text-white">{routineConfirmation.type === "planning" ? "Criação de Roteiros" : "Gravação/Execução"}</span>?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent text-white border-white/20 hover:bg-white/10">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={executeSendRoutineToAgenda} className="bg-accent text-white hover:bg-accent/90">Confirmar Agendamento</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto px-0 md:px-0 pb-20 md:pb-0">
            {!isFormInitialized ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
            ) : (
                <>
                    {screen === "vision" && renderVision()}
                    {screen === "routine" && renderRoutine()}
                    {screen === "monthly" && renderMonthly()}
                    {screen === "detail" && renderDetail()}
                </>
            )}
        </div>
    );
}
