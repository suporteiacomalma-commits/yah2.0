import { useState, useRef, useEffect } from "react";
import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft, Lightbulb, Mic, Search, Folder, Sparkles,
    Loader2, Send, X, MoreHorizontal, Check, Trash2,
    Calendar, ListTodo, Brain, ScrollText, Plus, MessageSquare,
    ChevronRight, Clock, Info, Share2, Tag, Instagram, Zap, FileText, Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/hooks/useBrand";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type InboxState =
    | "initial"
    | "recording"
    | "processing"
    | "review"
    | "triage"
    | "content_suggestion"
    | "goal_setup"
    | "folders"
    | "folder_detail"
    | "item_detail"
    | "search"
    | "burst_mode"
    | "insights";

const FOLDERS = [
    { name: "Conteúdo", icon: "✍️", description: "Ideias de posts e campanhas", color: "#A855F7" },
    { name: "Metas", icon: "🎯", description: "Objetivos com progresso", color: "#EC4899" },
    { name: "Insights", icon: "💡", description: "Aprendizados estratégicos", color: "#EAB308" },
    { name: "Produto", icon: "🚀", description: "Ofertas e serviços", color: "#22D3EE" },
    { name: "Projeto", icon: "📂", description: "Iniciativas e eventos", color: "#3B82F6" },
    { name: "Stand-by", icon: "🕰️", description: "Ideias para o futuro", color: "#8B5CF6" },
    { name: "Construção", icon: "🤔", description: "Ideias em rascunho", color: "#D1D5DB" }
];

export default function IdeiaInbox() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { brand, updateBrand } = useBrand();
    const { getSetting, isLoading: isLoadingSettings } = useSystemSettings();

    // State Management
    const [inboxState, setInboxState] = useState<InboxState>("initial");
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [editingTranscript, setEditingTranscript] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedIdea, setSelectedIdea] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        fetchIdeas();
    }, [user]);

    const fetchIdeas = async () => {
        if (!user) return;
        try {
            const { data, error } = await (supabase.from("idea_inbox" as any) as any)
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            if (data) setSavedIdeas(data);
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    // Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (blob.size > 0) {
                    await transcribeAudio(blob);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsListening(true);
            setInboxState("recording");
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 60 && inboxState !== "burst_mode") {
                        setInboxState("burst_mode");
                        toast.info("Modo Rajada ativado: Continue falando!");
                    }
                    return prev + 1;
                });
            }, 1000);

            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const rec = new SpeechRecognition();
                rec.continuous = true;
                rec.interimResults = true;
                rec.lang = "pt-BR";
                rec.onresult = (event: any) => {
                    let interim = "";
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        interim += event.results[i][0].transcript;
                    }
                    setTranscript(interim);
                };
                rec.start();
                recognitionRef.current = rec;
            }

        } catch (error) {
            console.error("Mic error:", error);
            toast.error("Erro ao acessar microfone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setIsListening(false);
    };

    const transcribeAudio = async (blob: Blob) => {
        setInboxState("processing");
        setIsProcessing(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("API Key não configurada");

            const formData = new FormData();
            formData.append("file", blob, "audio.webm");
            formData.append("model", "whisper-1");
            formData.append("language", "pt");

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                body: formData
            });

            if (!response.ok) throw new Error("Whisper failed");

            const data = await response.json();
            setEditingTranscript(data.text);
            setInboxState("review");
        } catch (error: any) {
            console.error("Transcription error:", error);
            toast.error("Erro na transcrição: " + error.message);
            setInboxState("initial");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTextSubmit = async (text: string) => {
        if (!text.trim()) return;
        setEditingTranscript(text);
        await analyzeIdea(text);
    };

    const analyzeIdea = async (content: string, mode: 'normal' | 'rajada' = 'normal') => {
        setInboxState("processing");
        setIsProcessing(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("API Key não configurada");

            const brandContext = brand ? `
                Nicho: ${brand.dna_nicho || 'Não definido'}
                Produto: ${brand.dna_produto || 'Não definido'}
                Objetivo: ${brand.dna_objetivo || 'Não definido'}
                Essência: ${brand.result_essencia || 'Não definida'}
                Pilares: ${brand.dna_pilares?.map((p: any) => p.name || p).join(', ') || 'Não definidos'}
            ` : '';

            const prompt = `Você é a Yah, uma assistente de estratégia para mentes atípicas.
            Sua tarefa é analisar a ideia do usuário e organizá-la seguindo regras estritas.

            CONTEXTO DO USUÁRIO:
            ${brandContext}

            MODO: ${mode}
            CONTEÚDO PARA ANÁLISE: "${content}"

            REGRAS DE CATEGORIZAÇÃO:
            - Conteúdo (conteudo): Posts, vídeos, reels, stories, temas de feed, educação, dor, identificação, polêmica.
            - Meta (meta): Objetivo concreto com número ou resultado (ex: fechar clientes, bater seguidores).
            - Insight (insight): Percepção, regra ou padrão (ex: horários de postagem, comportamento do público).
            - Produto (produto): Oferta específica (curso, mentoria, app, evento pago).
            - Projeto (projeto): Iniciativa ampla com várias ações (evento, reforma, nova temporada).
            - Em construção (em_construcao): Vago, confuso, rascunho inicial.
            - Stand-by (standby): Ideia de conteúdo guardada para depois ou não definida.

            REGRAS DE SAÍDA POR CATEGORIA:

            1. Se categoria = "conteudo":
               Gere "sugestao_conteudo" com: semana_ideal (1-4), dia_ideal, formato_feed, formato_stories, headline, micro_headline, intencao_conteudo (identificação, educação, etc), mini_roteiro (array de passos) e observacoes.

            2. Se categoria = "meta":
               Gere "sugestao_meta" com: descricao_meta, unidade, valor_alvo, checklist_passos (3-7 passos) e sugestao_inicio_calendario.

            3. Se categoria = "insight":
               Gere "sugestao_insight" com: descricao_regra, como_influencia_yah (array de strings) e formatos_afetados (array).

            4. Se categoria = "produto" ou "projeto":
               Gere o checklist inicial e próximos passos específicos.

            MODO RAJADA:
            Se modo = "rajada", separe o conteúdo em itens individuais. Cada item deve ter "id_interno", "trecho_original" e sua própria análise completa.

            FORMATO DE RETORNO (JSON):
            {
                "modo": "${mode}",
                ${mode === 'rajada' ? '"itens": [ ... ]' : `
                "category": "conteudo" | "meta" | "insight" | "produto" | "projeto" | "em_construcao" | "standby",
                "title": "string",
                "summary": "string",
                "suggested_destination": "string (Pasta correspondente)",
                "ai_insights": "string",
                "is_urgent": boolean,
                "sugestao_conteudo": { ... },
                "sugestao_meta": { ... },
                "sugestao_insight": { ... },
                "sugestao_produto": { ... },
                "sugestao_projeto": { ... },
                "marcar_em_construcao": boolean,
                "marcar_standby": boolean
                `}
            }
            Retorne APENAS o JSON.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "system", content: "Expert em estratégia." }, { role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            const result = JSON.parse(data.choices[0].message.content);
            setAnalysisResult(result);
            setInboxState("triage");
        } catch (error: any) {
            console.error("Analysis error:", error);
            toast.error("Erro na análise: " + error.message);
            setInboxState("review");
        } finally {
            setIsProcessing(false);
        }
    };

    const saveIdeaDirectly = async () => {
        if (!editingTranscript) return;
        setIsProcessing(true);
        try {
            const { error } = await (supabase.from("idea_inbox" as any) as any).insert({
                user_id: user?.id,
                content: editingTranscript,
                category: analysisResult?.category || "folder",
                folder: analysisResult?.suggested_destination || "Sem Pasta",
                metadata: analysisResult || {},
                status: "processed"
            });

            if (error) throw error;
            toast.success("Ideia salva!");
            setInboxState("initial");
            fetchIdeas();
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const addToWeeklyPlan = async () => {
        if (!brand || !analysisResult || !user) return;
        setIsProcessing(true);
        try {
            const { data: latestBrand, error: fetchError } = await (supabase.from("brands" as any) as any)
                .select("weekly_structure_data")
                .eq("id", brand.id)
                .single();

            if (fetchError) throw fetchError;

            const currentStructure = latestBrand.weekly_structure_data || { weeks: [] };

            const sugg = analysisResult.sugestao_conteudo;
            const weekIdx = (sugg?.semana_ideal || 1) - 1;

            const dayMapping: { [key: string]: number } = {
                "segunda": 1, "terça": 2, "quarta": 3, "quinta": 4, "sexta": 5, "sábado": 6, "sabado": 6, "domingo": 7
            };
            const dayIdx = dayMapping[(sugg?.dia_ideal || "segunda").toLowerCase()] || 1;

            if (!currentStructure.weeks) currentStructure.weeks = [];
            if (!currentStructure.weeks[weekIdx]) currentStructure.weeks[weekIdx] = { days: {} };
            if (!currentStructure.weeks[weekIdx].days) currentStructure.weeks[weekIdx].days = {};
            if (!currentStructure.weeks[weekIdx].days[dayIdx]) currentStructure.weeks[weekIdx].days[dayIdx] = { feed: { notes: [] }, stories: { notes: [] } };

            const daySlot = currentStructure.weeks[weekIdx].days[dayIdx];
            if (!daySlot.feed) daySlot.feed = { notes: [] };
            if (!daySlot.feed.notes) daySlot.feed.notes = [];

            daySlot.feed.notes.push({
                content: analysisResult.summary,
                title: sugg?.headline || analysisResult.title,
                micro_headline: sugg?.micro_headline,
                mini_roteiro: sugg?.mini_roteiro,
                source: "Ideia Inbox",
                type: analysisResult.category,
                intencao: sugg?.intencao_conteudo,
                formato_feed: sugg?.formato_feed,
                formato_stories: sugg?.formato_stories
            });

            const { error: updateError } = await (supabase.from("brands" as any) as any)
                .update({ weekly_structure_data: currentStructure })
                .eq("id", brand.id);

            if (updateError) throw updateError;

            await saveIdeaDirectly();
        } catch (error: any) {
            toast.error("Erro ao vincular: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const deleteIdea = async (id: string) => {
        try {
            const { error } = await (supabase.from("idea_inbox" as any) as any)
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Ideia excluída!");
            setSavedIdeas(prev => prev.filter(i => i.id !== id));
            if (selectedIdea?.id === id) setInboxState("initial");
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message);
        }
    };

    const filteredSearchIdeas = savedIdeas.filter(i =>
        i.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.metadata?.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderProcessing = () => (
        <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700">
            <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Brain className="w-10 h-10 text-primary absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-4">
                <h3 className="text-2xl font-bold">Yah está processando...</h3>
                <p className="text-muted-foreground italic">"Transformando caos em clareza."</p>
            </div>
            <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
            </div>
        </div>
    );

    const renderReview = () => (
        <div className="w-full max-w-2xl space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-black gradient-text">Revisão de Captura</h2>
                <p className="text-muted-foreground text-lg italic">Ajuste o texto se necessário antes da triagem.</p>
            </div>

            <div className="relative p-8 rounded-[40px] bg-card/60 border border-white/5 shadow-2xl focus-within:border-primary/30 transition-all">
                <textarea
                    className="w-full bg-transparent border-none focus:ring-0 text-xl leading-relaxed italic selection:bg-primary/20 min-h-[200px] resize-none"
                    value={editingTranscript}
                    onChange={(e) => setEditingTranscript(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="flex gap-4">
                <Button variant="outline" onClick={() => setInboxState("initial")} className="flex-1 h-14 rounded-2xl font-bold">
                    Descartar
                </Button>
                <Button onClick={() => analyzeIdea(editingTranscript)} className="flex-1 h-14 rounded-2xl gradient-primary text-white font-bold shadow-xl">
                    Confirmar e Triar
                </Button>
            </div>
        </div>
    );

    const renderTriage = () => {
        if (!analysisResult) return null;

        // Special handling for Burst Mode (Rajada)
        if (analysisResult.modo === 'rajada' && analysisResult.itens) {
            return (
                <div className="w-full h-full space-y-8 animate-in fade-in py-4 flex flex-col items-center">
                    <div className="text-center space-y-4 max-w-2xl">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                            <Zap className="w-8 h-8 text-amber-500" />
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter leading-none italic uppercase">Modo Rajada</h2>
                        <p className="text-muted-foreground text-lg">Processamos {analysisResult.itens.length} ideias simultaneamente.</p>
                    </div>

                    <div className="w-full max-w-4xl space-y-4">
                        {analysisResult.itens.map((item: any, idx: number) => (
                            <div key={idx} className="p-6 rounded-3xl bg-card/40 border border-white/5 hover:border-primary/20 transition-all group flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-lg">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground italic truncate max-w-md">"{item.trecho_original}"</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 rounded-full bg-secondary/50 text-[10px] font-black uppercase">
                                        {item.suggested_destination}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <ChevronRight className="w-4 h-4 text-primary" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 w-full max-w-md">
                        <Button variant="outline" onClick={() => setInboxState("initial")} className="flex-1 h-14 rounded-2xl font-bold">
                            Voltar
                        </Button>
                        <Button onClick={saveIdeaDirectly} className="flex-1 h-14 rounded-2xl gradient-primary text-white font-bold shadow-xl">
                            Salvar Tudo
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full h-full space-y-10 animate-in fade-in py-4 flex flex-col items-center">
                <div className="text-center space-y-2 max-w-2xl">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter leading-none italic uppercase">Yah Triagem Inteligente</h2>
                    <p className="text-muted-foreground text-lg">Identificamos o melhor destino para seu insight.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
                    {/* Main Summary Card */}
                    <div className="p-10 rounded-[48px] bg-card/40 border border-white/5 shadow-2xl space-y-6 flex flex-col hover:border-primary/20 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                    <Lightbulb className="w-5 h-5 text-amber-500" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sugestão</span>
                            </div>
                            {analysisResult.is_urgent && (
                                <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse border border-red-500/20">Urgente</span>
                            )}
                        </div>
                        <div className="flex-1 space-y-4">
                            <h3 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">{analysisResult.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">{analysisResult.summary}</p>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Categoria: {analysisResult.category}</span>

                            <div className="relative group/folder">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-2 rounded-full bg-secondary/50 hover:bg-secondary text-[10px] font-black uppercase tracking-widest px-3 border border-white/5"
                                >
                                    <Folder className="w-3 h-3" />
                                    {analysisResult.suggested_destination}
                                    <ChevronRight className="w-3 h-3 opacity-50" />
                                </Button>

                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-card border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-focus-within/folder:opacity-100 group-focus-within/folder:visible transition-all z-20 overflow-hidden">
                                    <div className="p-2 space-y-1">
                                        {FOLDERS.map(f => (
                                            <button
                                                key={f.name}
                                                onClick={() => setAnalysisResult({ ...analysisResult, suggested_destination: f.name })}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors hover:bg-primary/10",
                                                    analysisResult.suggested_destination === f.name ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {f.icon} {f.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Suggestion Details */}
                    <div className="space-y-6">
                        {analysisResult.category === 'conteudo' && analysisResult.sugestao_conteudo && (
                            <div className="p-8 rounded-[40px] bg-primary/5 border border-primary/10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Plano de Conteúdo
                                    </h4>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{analysisResult.sugestao_conteudo.dia_ideal} • Semana {analysisResult.sugestao_conteudo.semana_ideal}</span>
                                </div>
                                <div className="space-y-2">
                                    <h5 className="text-lg font-bold leading-none">{analysisResult.sugestao_conteudo.headline}</h5>
                                    <p className="text-xs text-muted-foreground italic">{analysisResult.sugestao_conteudo.micro_headline}</p>
                                </div>
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Roteiro Sugerido:</span>
                                    <div className="space-y-2">
                                        {analysisResult.sugestao_conteudo.mini_roteiro?.map((step: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-xs leading-relaxed">
                                                <span className="text-primary font-bold">{i + 1}.</span>
                                                <span className="text-foreground/80">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {analysisResult.category === 'meta' && analysisResult.sugestao_meta && (
                            <div className="p-8 rounded-[40px] bg-emerald-500/5 border border-emerald-500/10 space-y-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Plano de Meta
                                </h4>
                                <div className="space-y-1">
                                    <p className="text-xl font-bold">{analysisResult.sugestao_meta.descricao_meta}</p>
                                    <p className="text-xs text-muted-foreground italic">Início sugerido: {analysisResult.sugestao_meta.sugestao_inicio_calendario}</p>
                                </div>
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Checklist de Execução:</span>
                                    <div className="space-y-2">
                                        {analysisResult.sugestao_meta.checklist_passos?.map((step: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-xs items-center">
                                                <div className="w-4 h-4 rounded-full border border-emerald-500/30 flex items-center justify-center text-[8px] text-emerald-500 font-bold shrink-0">{i + 1}</div>
                                                <span className="text-foreground/80">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {analysisResult.category === 'insight' && analysisResult.sugestao_insight && (
                            <div className="p-8 rounded-[40px] bg-amber-500/5 border border-amber-500/10 space-y-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> Regra do Insight
                                </h4>
                                <p className="text-lg font-bold leading-tight italic">"{analysisResult.sugestao_insight.descricao_regra}"</p>
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Impacto no Sistema:</span>
                                    <div className="space-y-2">
                                        {analysisResult.sugestao_insight.como_influencia_yah?.map((impact: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-xs italic text-foreground/70">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                                <span>{impact}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Fallback AI Insight if no specific category suggestion */}
                        {(!analysisResult.sugestao_conteudo && !analysisResult.sugestao_meta && !analysisResult.sugestao_insight) && (
                            <div className="p-8 rounded-[40px] bg-primary/5 border border-primary/10 space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Brain className="w-4 h-4" /> AI Insight
                                </h4>
                                <p className="text-sm italic leading-relaxed text-foreground/80">"{analysisResult.ai_insights}"</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setInboxState("initial")}
                                className="h-14 rounded-2xl font-bold border-white/5 hover:bg-white/5"
                            >
                                Descartar
                            </Button>
                            {analysisResult.category === 'conteudo' ? (
                                <Button
                                    onClick={addToWeeklyPlan}
                                    className="h-14 rounded-2xl gradient-primary text-white font-bold shadow-xl flex items-center gap-2"
                                >
                                    <Calendar className="w-4 h-4" /> Vincular Semana
                                </Button>
                            ) : (
                                <Button
                                    onClick={saveIdeaDirectly}
                                    className="h-14 rounded-2xl gradient-primary text-white font-bold shadow-xl"
                                >
                                    Salvar Ideia
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderContentSuggestion = () => null;

    // Render Helpers
    // Render Helpers
    const renderInitial = () => {
        const foldersList = (
            <div className="w-full pt-12 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Folder className="w-4 h-4" /> Suas Pastas
                    </h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
                    {FOLDERS.map(f => {
                        const count = savedIdeas.filter(i => i.folder === f.name).length;
                        return (
                            <Button
                                key={f.name}
                                variant="outline"
                                onClick={() => { setSelectedFolder(f.name); setInboxState("folder_detail"); }}
                                className="h-40 rounded-[32px] flex flex-col items-start p-6 border-white/5 hover:border-primary/40 bg-card/40 hover:bg-card transition-all group shadow-2xl relative overflow-hidden text-left"
                            >
                                <div className="flex justify-between w-full items-start mb-4">
                                    <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform">{f.icon}</span>
                                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                        {count}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h4 className="text-2xl font-black tracking-tight" style={{ color: f.color }}>{f.name}</h4>
                                    <p className="text-xs text-muted-foreground font-medium leading-tight opacity-70">{f.description}</p>
                                </div>

                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight className="w-4 h-4" style={{ color: f.color }} />
                                </div>
                            </Button>
                        );
                    })}
                </div>
            </div>
        );

        return (
            <div className="flex flex-col items-center w-full space-y-12 animate-in fade-in duration-500">
                {/* Massive Animated Voice/Text Area */}
                <div className="flex flex-col items-center space-y-10 w-full max-w-2xl py-8">
                    {inboxState === "recording" || inboxState === "burst_mode" ? (
                        renderRecording()
                    ) : (
                        <>
                            <div className="relative group cursor-pointer" onClick={startRecording}>
                                <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center glow-primary hover:scale-105 transition-transform duration-500 active:scale-95">
                                    <Mic className="w-12 h-12 text-white" />
                                </div>
                                <div className="absolute -inset-4 border border-primary/20 rounded-full animate-pulse group-hover:animate-ping" />
                            </div>

                            <div className="space-y-4 max-w-md text-center">
                                <h2 className="text-4xl font-black tracking-tighter italic uppercase text-foreground leading-[0.9]">Diga seu insight</h2>
                                <p className="text-muted-foreground text-base px-6">
                                    Pressione para capturar ou use a busca abaixo.
                                </p>
                            </div>

                            <div className="w-full flex gap-3 p-3 bg-background/50 rounded-[24px] border border-white/10 shadow-inner focus-within:border-primary/50 transition-all">
                                <Search className="w-5 h-5 text-muted-foreground/50 ml-3 mt-3" />
                                <input
                                    type="text"
                                    placeholder="Ou digite sua ideia de produto, post..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 px-2 text-foreground text-lg placeholder:text-muted-foreground/30"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTextSubmit(e.currentTarget.value);
                                    }}
                                />
                                <Button size="icon" className="rounded-2xl h-12 w-12 gradient-primary shadow-lg" onClick={() => {
                                    const input = document.querySelector('input') as HTMLInputElement;
                                    handleTextSubmit(input.value);
                                }}>
                                    <Send className="w-5 h-5 text-white" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                {/* Always visible components */}
                <div className="w-full">
                    {foldersList}

                    {savedIdeas.length > 0 && (
                        <div className="w-full pt-12 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Últimos Insights</h3>
                                <Button variant="ghost" size="sm" onClick={() => setInboxState("search")} className="text-xs">Buscar todos</Button>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar">
                                {savedIdeas.slice(0, 5).map(idea => (
                                    <div
                                        key={idea.id}
                                        onClick={() => { setSelectedIdea(idea); setInboxState("item_detail"); }}
                                        className="min-w-[220px] p-5 rounded-3xl bg-card border border-border/50 hover:border-primary/30 cursor-pointer transition-all space-y-3 text-left shrink-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{idea.category}</span>
                                        </div>
                                        <h4 className="text-sm font-bold line-clamp-2 leading-tight">{idea.metadata?.title || idea.content}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(idea.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderRecording = () => (
        <div className="flex flex-col items-center justify-center text-center space-y-10 animate-in zoom-in-95 duration-300 w-full">
            <div className="relative">
                <div className="w-32 h-32 rounded-full bg-destructive flex items-center justify-center glow-destructive animate-pulse" onClick={stopRecording}>
                    <Mic className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -inset-4 border-2 border-destructive/20 rounded-full animate-ping opacity-50" />
            </div>

            <div className="space-y-6">
                <div className="text-4xl font-mono font-black text-destructive tracking-widest">
                    {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="min-h-[40px] px-8">
                    <p className="text-lg font-bold italic text-foreground/80 tracking-tight line-clamp-1">
                        {transcript || "YAh ouvindo você..."}
                    </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-destructive font-black animate-pulse text-[10px] uppercase tracking-[0.3em]">
                    <div className="w-1 h-1 rounded-full bg-destructive" />
                    Capturando Fluxo
                </div>
            </div>

            <Button onClick={stopRecording} className="rounded-full h-14 px-10 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest shadow-xl shadow-destructive/20 active:scale-95">
                Concluir
            </Button>
        </div>
    );

    const renderFolderDetail = () => {
        const filteredIdeas = savedIdeas.filter(i => i.folder === selectedFolder);
        return (
            <div className="w-full h-full space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Folder className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold">{selectedFolder}</h2>
                        <span className="text-sm text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">{filteredIdeas.length} itens</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setInboxState("folders")}>Voltar às Pastas</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredIdeas.length > 0 ? filteredIdeas.map(idea => (
                        <div
                            key={idea.id}
                            onClick={() => { setSelectedIdea(idea); setInboxState("item_detail"); }}
                            className="p-6 rounded-3xl bg-card border border-border/50 hover:border-primary/30 cursor-pointer transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter",
                                        idea.category === 'content' ? 'bg-amber-500/20 text-amber-500' :
                                            idea.category === 'goal' ? 'bg-green-500/20 text-green-500' :
                                                'bg-blue-500/20 text-blue-500'
                                    )}>
                                        {idea.category}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{format(new Date(idea.created_at), "dd/MM/yyyy")}</span>
                                </div>
                                <h3 className="text-lg font-bold leading-tight">{idea.metadata?.title || "Ideia sem título"}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{idea.content}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-2 py-20 text-center space-y-4 border-2 border-dashed border-border rounded-3xl">
                            <Info className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                            <p className="text-muted-foreground">Nenhuma ideia nesta pasta ainda.</p>
                            <Button variant="outline" onClick={() => setInboxState("initial")}>Capturar Nova</Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderItemDetail = () => {
        if (!selectedIdea) return null;
        return (
            <div className="w-full h-full space-y-8 animate-in zoom-in-95 duration-500">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
                                    {selectedIdea.category}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(selectedIdea.created_at), "eeee, dd MMMM HH:mm", { locale: ptBR })}
                                </div>
                            </div>
                            <h2 className="text-3xl font-black tracking-tight leading-tight">{selectedIdea.metadata?.title || "Sua Ideia"}</h2>
                        </div>

                        <div className="p-8 rounded-[32px] bg-card/60 border border-white/5 shadow-xl space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Conteúdo Original</h3>
                            <p className="text-lg leading-relaxed whitespace-pre-wrap italic">
                                "{selectedIdea.content}"
                            </p>
                        </div>

                        {selectedIdea.metadata?.ai_insights && (
                            <div className="p-8 rounded-[32px] bg-primary/5 border border-primary/20 space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> AI Insights & Sugestões
                                </h3>
                                <p className="text-foreground/90 leading-relaxed">
                                    {selectedIdea.metadata.ai_insights}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-72 space-y-4">
                        <Card className="p-4 space-y-3 bg-secondary/20 border-none">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ações Rápidas</h4>
                            <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-12 border-border/50 hover:bg-background">
                                <Calendar className="w-4 h-4 text-primary" /> Agendar Post
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-12 border-border/50 hover:bg-background">
                                <ListTodo className="w-4 h-4 text-accent" /> Criar Tracker
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-12 border-border/50 hover:bg-background">
                                <Share2 className="w-4 h-4 text-blue-500" /> Compartilhar
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => deleteIdea(selectedIdea.id)}
                                className="w-full justify-start gap-3 rounded-xl h-12 border-destructive/20 text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-4 h-4" /> Excluir Ideia
                            </Button>
                        </Card>

                        <div className="p-4 space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pasta</h4>
                            <div className="flex items-center gap-2 text-sm font-bold bg-card p-3 rounded-xl border border-border">
                                <Folder className="w-4 h-4 text-primary" />
                                {selectedIdea.folder || "Sem Pasta"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <MinimalLayout brandName={brand?.name}>
            <div className="flex-1 p-6 md:p-8 h-screen-safe overflow-hidden flex flex-col">
                <div className="max-w-5xl mx-auto w-full h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (inboxState === "initial") navigate("/dashboard");
                                else if (inboxState === "folder_detail") setInboxState("folders");
                                else if (inboxState === "item_detail" && selectedFolder) setInboxState("folder_detail");
                                else setInboxState("initial");
                            }}
                            className="text-muted-foreground hover:bg-transparent hover:text-foreground transition-colors p-0 h-auto"
                        >
                            <ArrowLeft className="w-5 h-5 mr-1" />
                            <span className="font-bold uppercase tracking-tighter text-xs">
                                {inboxState === "initial" ? "Painel" : inboxState === "folder_detail" ? "Pastas" : "Voltar"}
                            </span>
                        </Button>
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setInboxState("initial")}>
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-all">
                                <Lightbulb className="w-5 h-5 text-amber-500" />
                            </div>
                            <h1 className="text-2xl font-black italic tracking-tighter text-foreground selection:bg-amber-500/30">Ideia Inbox</h1>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 bg-card/40 backdrop-blur-[40px] border border-white/5 rounded-[48px] p-8 md:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col items-center justify-center custom-scrollbar overflow-y-auto">
                        {/* Static Atmosphere */}
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/4" />

                        {(inboxState === "initial" || inboxState === "recording" || inboxState === "burst_mode") && renderInitial()}
                        {inboxState === "triage" && renderTriage()}
                        {inboxState === "content_suggestion" && renderContentSuggestion()}
                        {inboxState === "processing" && renderProcessing()}
                        {inboxState === "review" && renderReview()}
                        {inboxState === "folder_detail" && renderFolderDetail()}
                        {inboxState === "item_detail" && renderItemDetail()}
                        {inboxState === "insights" && (
                            <div className="text-center space-y-6 max-w-md animate-in zoom-in">
                                <Brain className="w-16 h-16 text-primary mx-auto opacity-50" />
                                <h3 className="text-2xl font-bold">Insights Pessoais</h3>
                                <p className="text-muted-foreground italic">"Trabalhando a cada 15 dias, você terá um padrão de produtividade..."</p>
                                <p className="text-sm text-muted-foreground">Com base no que você capturou, a YAh percebeu padrões cruciais para sua jornada.</p>
                                <Button variant="outline" onClick={() => setInboxState("initial")}>Voltar</Button>
                            </div>
                        )}

                        {inboxState === "search" && (
                            <div className="w-full h-full space-y-8 animate-in fade-in py-4 flex flex-col">
                                <div className="w-full flex gap-4 p-4 bg-background/50 rounded-[28px] border border-white/5 shadow-inner focus-within:border-primary/40 transition-all shrink-0">
                                    <Search className="w-6 h-6 text-primary ml-2 mt-1" />
                                    <input
                                        type="text"
                                        placeholder="Busca semântica avançada..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 px-2 text-xl font-medium placeholder:text-muted-foreground/30"
                                        autoFocus
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")}><X className="w-4 h-4" /></Button>}
                                </div>

                                {searchQuery ? (
                                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                        {filteredSearchIdeas.map(idea => (
                                            <div
                                                key={idea.id}
                                                onClick={() => { setSelectedIdea(idea); setInboxState("item_detail"); }}
                                                className="p-6 rounded-3xl bg-card border border-border/50 hover:border-primary/30 cursor-pointer transition-all"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">{idea.category}</span>
                                                    <span className="text-[10px] text-muted-foreground">{format(new Date(idea.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                                                </div>
                                                <h4 className="text-lg font-bold">{idea.metadata?.title || idea.content.substring(0, 50) + "..."}</h4>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{idea.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/30 py-20 bg-background/20 rounded-[40px] border border-dashed border-white/5">
                                        <Brain className="w-20 h-20 mb-6 opacity-10" />
                                        <p className="text-lg font-bold">Inicie sua busca</p>
                                        <p className="text-sm">Encontraremos ideias por contexto, não apenas palavras.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .glow-primary {
                    box-shadow: 0 0 60px rgba(var(--primary), 0.2);
                }
                .h-screen-safe {
                    height: calc(100vh - 40px);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                }
                .gradient-text {
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}} />
        </MinimalLayout>
    );
}

function Card({ children, className, ...props }: any) {
    return (
        <div className={cn("bg-card/40 border border-white/5 rounded-3xl overflow-hidden shadow-sm backdrop-blur-md", className)} {...props}>
            {children}
        </div>
    );
}
