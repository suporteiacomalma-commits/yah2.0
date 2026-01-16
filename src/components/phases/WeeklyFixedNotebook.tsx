import React, { useState, useEffect, useRef } from "react";
import {
    ChevronRight,
    ChevronLeft,
    Save,
    Wand2,
    Settings,
    Calendar,
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
    Book
} from "lucide-react";
import { useBrand, Brand } from "@/hooks/useBrand";
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

export function WeeklyFixedNotebook() {
    const { brand, updateBrand } = useBrand();
    const { getSetting } = useSystemSettings();

    const [screen, setScreen] = useState<Screen>("vision");
    const [currentWeek, setCurrentWeek] = useState(1);
    const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
    const [detailTab, setDetailTab] = useState<DetailTab>("feed");
    const [isFormInitialized, setIsFormInitialized] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isWritingScript, setIsWritingScript] = useState(false);
    const isDirty = useRef(false);

    const [routineData, setRoutineData] = useState<Partial<Brand>>({});
    const [weeklyData, setWeeklyData] = useState<any>({});

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

    const handleRoutineChange = (field: keyof Brand, value: any) => {
        setRoutineData(prev => ({ ...prev, [field]: value }));
        isDirty.current = true;
    };

    const handleDataChange = (tab: DetailTab, field: string, value: any) => {
        const newData = JSON.parse(JSON.stringify(weeklyData)); // Deep clone
        if (!newData[currentWeek - 1]) newData[currentWeek - 1] = {};
        if (!newData[currentWeek - 1][selectedDayIndex]) {
            newData[currentWeek - 1][selectedDayIndex] = { feed: {}, stories: {} };
        }

        newData[currentWeek - 1][selectedDayIndex][tab][field] = value;
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

    const saveWeeklyData = async () => {
        try {
            await updateBrand.mutateAsync({ updates: { weekly_structure_data: weeklyData } });
            toast.success("Ajustes salvos!");
            isDirty.current = false;
        } catch (error) {
            toast.error("Erro ao salvar ajustes");
        }
    };

    const generateWeeklyStructure = async () => {
        setIsGenerating(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("API Key não configurada");

            const prompt = `Você é um Estrategista de Conteúdo sênior.
      OBJETIVO: Gerar uma estrutura de 4 semanas de conteúdo para Instagram.
      
      ESTRUTURA OBRIGATÓRIA DO JSON:
      Gere um objeto JSON com a chave "weeks" que contenha uma lista de 4 objetos (um para cada semana).
      Cada semana deve ter chaves numéricas de 0 a 6 (representando Domingo a Sábado).
      Exemplo de mapeamento: 0: Domingo, 1: Segunda, 2: Terça, 3: Quarta, 4: Quinta, 5: Sexta, 6: Sábado.
      
      REGRAS CRÍTICAS DE FREQUÊNCIA:
      - Frequência: ${routineData.routine_posts_per_week} posts por semana.
      - Dias de Postagem PERMITIDOS: ${routineData.routine_posting_days?.join(", ")}.
      - Importante: Gere conteúdo APENAS para os dias listados em "Dias de Postagem".
      - Para os dias NÃO listados, retorne os objetos feed e stories vazios ou nulos.
      
      CONTEÚDO PARA CADA DIA ATIVO (JSON):
      - feed: { format, intention, headline, instruction, status: 'planned', notes: '' }
        IMPORTANTE: 'format' do feed DEVE ser EXATAMENTE um destes: Carrossel, Reels, Foto, Alternar.
      - stories: { format, intention, headline, instruction, status: 'planned', notes: '' }
        IMPORTANTE: 'format' do stories DEVE ser EXATAMENTE um destes: Caixa, Diário, Sequência, Conversa.
      
      CONTEXTO DA MARCA:
      Nome: ${brand?.name}
      Setor: ${brand?.sector}
      DNA: ${brand?.dna_tese}
      Personalidade: ${brand?.result_essencia}
      Intenções Preferidas: ${JSON.stringify(routineData.routine_intentions_prefs)}
      Formatos Preferidos: ${JSON.stringify(routineData.routine_feed_format_prefs)}
      Horários de Postagem: ${JSON.stringify(routineData.routine_fixed_hours)}
      
      Use tons de voz: ${brand?.user_tone_selected?.join(", ")}.
      As instruções devem ser curtas e diretas ao ponto.
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
                        { role: "system", content: "Expert em branding e estratégia de conteúdo. Saída sempre em JSON com a chave 'weeks'." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            let result = JSON.parse(data.choices[0].message.content);

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
                                notes: ''
                            },
                            stories: {
                                format: aiContent.stories?.format || 'Sequência',
                                intention: aiContent.stories?.intention || 'Engajamento',
                                headline: aiContent.stories?.headline || 'Headline pendente...',
                                instruction: aiContent.stories?.instruction || 'Compartilhe nos stories.',
                                status: 'planned',
                                notes: ''
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
            toast.success("Estratégia semanal gerada com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao gerar: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleWriteScript = async (tab: DetailTab) => {
        setIsWritingScript(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("API Key não configurada");

            const dayData = weeklyData[currentWeek - 1][selectedDayIndex][tab];
            const prompt = `Gere um roteiro detalhado para um ${tab === 'feed' ? 'Post de Feed' : 'Stories'} do Instagram.
      Título/Tema: ${dayData.headline}
      Formato: ${dayData.format}
      Intenção: ${dayData.intention}
      DNA da Marca: ${brand?.dna_tese}
      Instrução da IA: ${dayData.instruction}
      
      Gere um roteiro estruturado, direto e persuasivo.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Expert em copywriting e roteirização para redes sociais." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const data = await response.json();
            const script = data.choices[0].message.content;
            handleDataChange(tab, "notes", script);
            toast.success("Roteiro sugerido com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao gerar roteiro: " + error.message);
        } finally {
            setIsWritingScript(false);
        }
    };


    const handleCreateWithAI = (tab: DetailTab) => {
        const dayData = weeklyData[currentWeek - 1][selectedDayIndex][tab];
        const context = `[${tab.toUpperCase()}] ${dayData.format} - ${dayData.headline}\nIntenção: ${dayData.intention}\nInstrução: ${dayData.instruction}`;
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
            headline: `Extra: ${day.headline}`,
            notes: "",
            id: Date.now()
        });
        setWeeklyData(newData);
        isDirty.current = true;
        toast.info("Bloco extra adicionado!");
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

    const handleClearTab = (tab: DetailTab) => {
        if (!confirm(`Deseja limpar os campos de ${tab.toUpperCase()} deste dia?`)) return;
        const newData = JSON.parse(JSON.stringify(weeklyData));
        if (newData[currentWeek - 1]?.[selectedDayIndex]?.[tab]) {
            newData[currentWeek - 1][selectedDayIndex][tab] = {};
            setWeeklyData(newData);
            toast.success(`${tab.toUpperCase()} limpo com sucesso!`);
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
                if (day.feed?.headline || day.feed?.notes) {
                    doc.setFontSize(11);
                    doc.setTextColor(100, 100, 100);
                    doc.setFont("helvetica", "bold");
                    doc.text("FEED", margin + 5, yPos);
                    yPos += 6;
                    doc.setTextColor(0, 0, 0);

                    if (day.feed.headline) {
                        const cleanHeadline = cleanTextForPDF(day.feed.headline);
                        doc.setFont("helvetica", "bold");
                        doc.text(`TEMA: ${cleanHeadline}`, margin + 5, yPos);
                        yPos += lineHeight;
                    }

                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text(`Formato: ${day.feed.format || '-'} | Intenção: ${day.feed.intention || '-'}`, margin + 5, yPos);
                    yPos += lineHeight + 2;

                    if (day.feed.notes) {
                        doc.setFontSize(11);
                        const cleanNotes = cleanTextForPDF(day.feed.notes);
                        const splitNotes = doc.splitTextToSize(cleanNotes, contentWidth - 10);

                        // Verificar quebra de página dentro das notas
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
                if (day.stories?.headline || day.stories?.notes) {
                    // Verificar espaço para stories
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

                    if (day.stories.headline) {
                        const cleanHeadline = cleanTextForPDF(day.stories.headline);
                        doc.setFont("helvetica", "bold");
                        doc.text(`GANCHO: ${cleanHeadline}`, margin + 5, yPos);
                        yPos += lineHeight;
                    }

                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text(`Formato: ${day.stories.format || '-'} | Objetivo: ${day.stories.intention || '-'}`, margin + 5, yPos);
                    yPos += lineHeight + 2;

                    if (day.stories.notes) {
                        doc.setFontSize(11);
                        const cleanNotes = cleanTextForPDF(day.stories.notes);
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
            const scrollAmount = 350;
            scrollContainerRef.current.scrollBy({
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

    const renderVision = () => {
        const weekData = weeklyData[currentWeek - 1] || {};
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold">Estrutura fixa semanal</h2>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-background/50 border-border">
                                    Semana {currentWeek} <ChevronLeft className="w-4 h-4 ml-2 rotate-[-90deg]" />
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
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="w-4 h-4 mr-1" /> Limpar
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
                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="border-accent/40 hover:bg-accent/5">
                            <Book className="w-4 h-4 mr-1 text-accent" /> Exportar PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setScreen("routine")}>
                            <Settings className="w-4 h-4 mr-1" /> Rotina
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setScreen("monthly")}>
                            <Table className="w-4 h-4 mr-1" /> 30 Dias
                        </Button>
                    </div>
                </div>

                <div className="relative group">
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
                        className="flex gap-4 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory px-2 custom-scrollbar"
                    >
                        {DAYS_OF_WEEK.map((day, idx) => {
                            const dayContent = weekData[idx] || { feed: {}, stories: {} };
                            const isToday = new Date().getDay() === idx;
                            return (
                                <div key={day} className="min-w-[280px] md:min-w-[320px] snap-center">
                                    <Card className={cn(
                                        "h-full border-border bg-card/40 backdrop-blur-sm transition-all",
                                        isToday && "ring-2 ring-accent/20 border-accent/30"
                                    )}>
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-center">
                                                <span className={cn("text-xs font-bold uppercase tracking-wider", isToday ? "text-accent" : "text-muted-foreground")}>
                                                    {isToday ? "Hoje — " : ""}{day}
                                                </span>
                                                <div className={cn("w-2 h-2 rounded-full", getStatusColor(dayContent.feed?.status || 'planned'))} />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-4">
                                            <div className="p-3 rounded-xl bg-background/40 hover:bg-background/60 cursor-pointer border border-transparent hover:border-border transition-all space-y-2 shadow-sm"
                                                onClick={() => { setSelectedDayIndex(idx); setDetailTab("feed"); setScreen("detail"); }}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold flex items-center gap-1.5"><Instagram className="w-3 h-3 text-pink-500" /> FEED</span>
                                                    <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-bold uppercase">{dayContent.feed?.format || '---'}</span>
                                                </div>
                                                <p className="text-sm font-bold line-clamp-2 leading-tight">{dayContent.feed?.headline || 'Título da IA...'}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-background/40 hover:bg-background/60 cursor-pointer border border-transparent hover:border-border transition-all space-y-2 shadow-sm"
                                                onClick={() => { setSelectedDayIndex(idx); setDetailTab("stories"); setScreen("detail"); }}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold flex items-center gap-1.5"><MessageSquare className="w-3 h-3 text-orange-400" /> STORIES</span>
                                                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase">{dayContent.stories?.format || '---'}</span>
                                                </div>
                                                <p className="text-sm font-bold line-clamp-2 leading-tight">{dayContent.stories?.headline || 'Headline Stories...'}</p>
                                                {dayContent.stories?.extraBlocks?.length > 0 && (
                                                    <div className="flex gap-1 mt-1">
                                                        {dayContent.stories.extraBlocks.map((_: any, i: number) => (
                                                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                        ))}
                                                    </div>
                                                )}
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
            </div>
        );
    };

    const renderRoutine = () => {
        return (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto">
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
                                <div className="flex gap-4">
                                    {[3, 5, 7].map(num => (
                                        <Button key={num} variant={routineData.routine_posts_per_week === num ? "default" : "outline"}
                                            onClick={() => handleRoutineChange("routine_posts_per_week", num)} className="flex-1">
                                            {num} dias
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Dias de Postagem (Frequência: {routineData.routine_posts_per_week} posts/semana)</Label>
                                <p className="text-[10px] text-muted-foreground italic -mt-2">Selecione exatamente os dias em que deseja postar.</p>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <div key={day} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border">
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
                                            <Label htmlFor={`post-${day}`} className="text-xs cursor-pointer">{day.substring(0, 3)}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Dias para criar roteiros (planejar)</Label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <div key={day} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border">
                                            <Checkbox
                                                id={`plan-${day}`}
                                                checked={routineData.routine_planning_days?.includes(day)}
                                                onCheckedChange={(checked) => {
                                                    const current = routineData.routine_planning_days || [];
                                                    if (checked) handleRoutineChange("routine_planning_days", [...current, day]);
                                                    else handleRoutineChange("routine_planning_days", current.filter(d => d !== day));
                                                }}
                                            />
                                            <Label htmlFor={`plan-${day}`} className="text-xs cursor-pointer">{day.substring(0, 3)}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Dias para gravar/executar</Label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <div key={day} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border">
                                            <Checkbox
                                                id={`exec-${day}`}
                                                checked={routineData.routine_execution_days?.includes(day)}
                                                onCheckedChange={(checked) => {
                                                    const current = routineData.routine_execution_days || [];
                                                    if (checked) handleRoutineChange("routine_execution_days", [...current, day]);
                                                    else handleRoutineChange("routine_execution_days", current.filter(d => d !== day));
                                                }}
                                            />
                                            <Label htmlFor={`exec-${day}`} className="text-xs cursor-pointer">{day.substring(0, 3)}</Label>
                                        </div>
                                    ))}
                                </div>
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
                            <div className="grid grid-cols-3 gap-3">
                                {["08h-12h", "13h-18h", "18h-22h"].map(block => (
                                    <Button
                                        key={block}
                                        variant={routineData.routine_fixed_hours?.includes(block) ? "default" : "outline"}
                                        onClick={() => {
                                            const current = routineData.routine_fixed_hours || [];
                                            if (current.includes(block)) handleRoutineChange("routine_fixed_hours", current.filter(b => b !== block));
                                            else handleRoutineChange("routine_fixed_hours", [...current, block]);
                                        }}
                                        className="text-xs py-6"
                                    >
                                        <Clock className="w-3 h-3 mr-1.5" /> {block}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border overflow-hidden">
                        <CardHeader className="bg-muted/30">
                            <CardTitle className="text-base">4. Intenção Principal por Dia</CardTitle>
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
        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setScreen("vision")}><ChevronLeft className="w-4 h-4 mr-1" /> Voltar</Button>
                    <div className="text-center">
                        <h3 className="text-sm font-bold uppercase tracking-widest">{DAYS_OF_WEEK[selectedDayIndex]}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase">{getPostDate(currentWeek, selectedDayIndex)} • Semana {currentWeek}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={saveWeeklyData} className="text-accent"><Save className="w-4 h-4 mr-1" /> Salvar</Button>
                </div>

                <Tabs defaultValue={detailTab} onValueChange={(v) => setDetailTab(v as DetailTab)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/30">
                        <TabsTrigger value="feed"><Instagram className="w-4 h-4 mr-2" /> FEED</TabsTrigger>
                        <TabsTrigger value="stories"><MessageSquare className="w-4 h-4 mr-2" /> STORIES</TabsTrigger>
                    </TabsList>

                    <TabsContent value="feed" className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Headline / Tema</Label>
                                <Input value={dayData.feed?.headline || ""} onChange={(e) => handleDataChange("feed", "headline", e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Formato</Label>
                                    <Select value={dayData.feed?.format || "Carrossel"} onValueChange={(val) => handleDataChange("feed", "format", val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{FEED_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Intenção</Label>
                                    <Select value={dayData.feed?.intention || "Conexão"} onValueChange={(val) => handleDataChange("feed", "intention", val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{INTENTION_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                                <Label className="text-[10px] font-bold text-accent uppercase flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> ESTRATÉGIA IA</Label>
                                <p className="text-sm mt-1">{dayData.feed?.instruction || "Gere para ver"}</p>
                            </div>
                            <Textarea placeholder="Roteiro..." className="min-h-[200px]" value={dayData.feed?.notes || ""} onChange={(e) => handleDataChange("feed", "notes", e.target.value)} />
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleWriteScript("feed")}
                                        disabled={isWritingScript || isGenerating}
                                        className={cn(
                                            "h-11 font-bold border-accent/30 hover:bg-accent/5",
                                            !dayData.feed?.notes && "animate-pulse border-accent/60 bg-accent/5"
                                        )}
                                    >
                                        {isWritingScript ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2 text-accent" />}
                                        {isWritingScript ? "Escrevendo..." : "Sugerir roteiro"}
                                    </Button>
                                    <Button variant="outline" className="h-11" onClick={() => handleAddExtraBlock("feed")}><Plus className="w-4 h-4 mr-2" /> Bloco Extra</Button>
                                </div>
                                <Button className="w-full h-12 gradient-primary" onClick={() => handleCreateWithAI("feed")} disabled={isGenerating}>Criar com a YAh</Button>
                                <Button variant="ghost" size="sm" onClick={() => handleClearTab("feed")} className="text-destructive/60 hover:text-destructive hover:bg-destructive/5 self-center">
                                    <Trash2 className="w-4 h-4 mr-2" /> Limpar Feed
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="stories" className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Micro-headline / Gancho</Label>
                                <Input placeholder="O gancho inicial dos seus stories..." value={dayData.stories?.headline || ""} onChange={(e) => handleDataChange("stories", "headline", e.target.value)} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Formato</Label>
                                    <Select value={dayData.stories?.format || "Sequência"} onValueChange={(val) => handleDataChange("stories", "format", val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{STORIES_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Objetivo</Label>
                                    <Select value={dayData.stories?.intention || "Conexão"} onValueChange={(val) => handleDataChange("stories", "intention", val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{INTENTION_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                <Label className="text-[10px] font-bold text-primary uppercase">BLOCO DE INSTRUÇÃO</Label>
                                <p className="text-sm mt-1">{dayData.stories?.instruction || "Gere para ver"}</p>
                            </div>
                            <Textarea placeholder="Notas / Roteiro dos Stories..." className="min-h-[200px]" value={dayData.stories?.notes || ""} onChange={(e) => handleDataChange("stories", "notes", e.target.value)} />
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleWriteScript("stories")}
                                        disabled={isWritingScript || isGenerating}
                                        className={cn(
                                            "h-11 font-bold border-accent/30 hover:bg-accent/5",
                                            !dayData.stories?.notes && "animate-pulse border-accent/60 bg-accent/5"
                                        )}
                                    >
                                        {isWritingScript ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2 text-accent" />}
                                        {isWritingScript ? "Escrevendo..." : "Escrever sequência"}
                                    </Button>
                                    <Button variant="outline" className="h-11" onClick={() => handleAddExtraBlock("stories")}><Plus className="w-4 h-4 mr-2" /> Bloco Extra Stories</Button>
                                </div>
                                <Button className="w-full h-12 gradient-primary" onClick={() => handleCreateWithAI("stories")} disabled={isGenerating}>Criar com a YAh - Stories</Button>
                                <Button variant="ghost" size="sm" onClick={() => handleClearTab("stories")} className="text-destructive/60 hover:text-destructive hover:bg-destructive/5 self-center">
                                    <Trash2 className="w-4 h-4 mr-2" /> Limpar Stories
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-0">
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
