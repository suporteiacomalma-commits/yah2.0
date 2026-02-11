import { useState, useRef, useEffect } from "react";
import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft, Lightbulb, Mic, Search, Folder, Sparkles,
    Loader2, Send, X, MoreHorizontal, Check, Trash2,
    Calendar as CalendarIcon, ListTodo, Brain, ScrollText, Plus, MessageSquare,
    ChevronRight, Clock, Info, Share2, Tag, Instagram, Zap, FileText, Target,
    Rocket, Eye, Layers, Play, FolderSync, Wrench, Megaphone, BarChart3, Settings2,
    PenTool, FolderOpen, MessageCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/hooks/useBrand";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { CerebroEvent } from "@/components/calendar/types";

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
    { name: "Conteúdo", emoji: "✍️", description: "Ideias de posts e campanhas", color: "#A855F7" },
    { name: "Metas", emoji: "🎯", description: "Objetivos com progresso", color: "#EC4899" },
    { name: "Insights", emoji: "💡", description: "Aprendizados estratégicos", color: "#EAB308" },
    { name: "Produto / serviço", emoji: "🚀", description: "Defina claramente o que você oferece e como entrega.", color: "#22D3EE" },
    { name: "Projeto", emoji: "📂", description: "Iniciativas e eventos", color: "#3B82F6" },
    { name: "Stand-by", emoji: "🕒", description: "Ideias para o futuro", color: "#8B5CF6" }
];

const AutoHeightTextarea = ({ value, onChange, className, placeholder, autoFocus }: any) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn("resize-none overflow-hidden", className)}
        />
    );
};

const InboxActivityCalendar = ({ type = 'meta', brandId }: { type?: 'meta' | 'projeto'; brandId?: string }) => {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [activities, setActivities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newActivityTitle, setNewActivityTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Color palette based on type
    const colors = type === 'meta' ? {
        text: 'text-emerald-500',
        bg: 'bg-emerald-500',
        bgHover: 'hover:bg-emerald-600',
        bgOpacity: 'bg-emerald-500/10',
        bgOpacity20: 'bg-emerald-500/20',
        border: 'border-emerald-500/20',
        border30: 'border-emerald-500/30',
        shadow: 'after:shadow-[0_0_5px_rgba(16,185,129,0.5)]',
        shadowBtn: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
        accent: 'emerald',
        icon: Target
    } : {
        text: 'text-blue-500',
        bg: 'bg-blue-500',
        bgHover: 'hover:bg-blue-600',
        bgOpacity: 'bg-blue-500/10',
        bgOpacity20: 'bg-blue-500/20',
        border: 'border-blue-500/20',
        border30: 'border-blue-500/30',
        shadow: 'after:shadow-[0_0_5px_rgba(59,130,246,0.5)]',
        shadowBtn: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
        accent: 'blue',
        icon: Rocket
    };

    // Recurrence states
    const [showOptions, setShowOptions] = useState(false);
    const [frequency, setFrequency] = useState<'none' | 'daily' | 'weekly'>('none');
    const [selectedDays, setSelectedDays] = useState<number[]>([]); // 0-6
    const [startTime, setStartTime] = useState("09:00");

    const daysOfWeek = [
        { label: 'D', value: 0 },
        { label: 'S', value: 1 },
        { label: 'T', value: 2 },
        { label: 'Q', value: 3 },
        { label: 'Q', value: 4 },
        { label: 'S', value: 5 },
        { label: 'S', value: 6 },
    ];

    const fetchActivities = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from("eventos_do_cerebro")
                .select("*")
                .eq("user_id", user.id)
                .order("data", { ascending: true });
            if (error) throw error;
            setActivities(data || []);
        } catch (error) {
            console.error("Error fetching activities:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, [user]);

    const isActivityOnDay = (activity: any, day: Date) => {
        if (!day) return false;
        // Handle timezone/date string
        const activityDate = new Date(activity.data + 'T12:00:00');

        // Match exact date
        if (isSameDay(activityDate, day)) return true;

        // Pattern matching for recurring tasks
        if (activity.recorrencia && activity.recorrencia !== 'Nenhuma') {
            // Ignore if day is before the start date
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const activityStart = new Date(activityDate);
            activityStart.setHours(0, 0, 0, 0);

            if (dayStart < activityStart) return false;

            if (activity.recorrencia === 'Diária') return true;
            if (activity.recorrencia === 'Semanal' && activity.dias_da_semana) {
                return activity.dias_da_semana.includes(day.getDay());
            }
        }
        return false;
    };

    const handleAddActivity = async () => {
        if (!user || !selectedDate || !newActivityTitle.trim()) return;
        setIsAdding(true);
        try {
            const [hours, minutes] = startTime.split(':').map(Number);
            const dateWithTime = new Date(selectedDate);
            dateWithTime.setHours(hours, minutes, 0, 0);

            const recurrenceData = frequency !== 'none' ? {
                isRecurring: true,
                frequency,
                days: frequency === 'weekly' ? (selectedDays.length > 0 ? selectedDays : [selectedDate.getDay()]) : [0, 1, 2, 3, 4, 5, 6],
                time: startTime
            } : { isRecurring: false, time: startTime };

            const { error } = await (supabase as any)
                .from("eventos_do_cerebro")
                .insert({
                    user_id: user.id,
                    titulo: newActivityTitle.trim(),
                    data: format(dateWithTime, 'yyyy-MM-dd'),
                    hora: startTime,
                    categoria: type === 'meta' ? "Trabalho" : "Trabalho", // Default to Trabalho/Work
                    tipo: "Tarefa",
                    recorrencia: frequency === 'none' ? 'Nenhuma' : frequency === 'daily' ? 'Diária' : 'Semanal',
                    dias_da_semana: frequency === 'weekly' ? (selectedDays.length > 0 ? selectedDays : [selectedDate.getDay()]) : [],
                    status: "Pendente"
                });
            if (error) throw error;
            toast.success(frequency !== 'none' ? "Rotina recorrente agendada!" : "Atividade agendada!");
            setNewActivityTitle("");
            setShowOptions(false);
            fetchActivities();
        } catch (error) {
            toast.error("Erro ao agendar rotina: " + (error as any).message);
        } finally {
            setIsAdding(false);
        }
    };

    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const selectedDayActivities = activities.filter(a =>
        selectedDate && isActivityOnDay(a, selectedDate)
    );

    const modifiers = {
        hasActivity: (day: Date) => activities.some(a => isActivityOnDay(a, day))
    };

    return (
        <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
                    <CalendarIcon className={cn("w-3 h-3", colors.text)} /> Calendário de {type === 'meta' ? 'Rotinas' : 'Ações'}:
                </span>
            </div>

            <div className="flex flex-col xl:flex-row gap-4 bg-white/[0.02] p-2 sm:p-4 rounded-3xl border border-white/5">
                <div className="w-full xl:w-[280px] shrink-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={ptBR}
                        modifiers={modifiers}
                        modifiersClassNames={{
                            hasActivity: cn("relative after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-current", colors.shadow, colors.text)
                        }}
                        className="rounded-xl border border-white/5 bg-black/20 p-1 sm:p-2 w-full"
                        classNames={{
                            day_selected: cn(colors.bg, "text-white focus:bg-current rounded-lg", colors.bgHover),
                            day_today: cn("bg-white/5 font-bold border rounded-lg", colors.text, colors.border),
                            day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-white/10 rounded-lg transition-all",
                            head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] uppercase opacity-50",
                            cell: "h-8 w-8 text-center text-xs p-0 relative",
                            nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 border border-white/10 rounded-md",
                        }}
                    />
                </div>

                <div className="flex-1 flex flex-col space-y-4 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", colors.text)}>
                            {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
                        </span>
                        <div className={cn("px-2 py-0.5 rounded-full border text-[9px] font-bold", colors.bgOpacity, colors.border, colors.text)}>
                            {selectedDayActivities.length} ativ.
                        </div>
                    </div>

                    <div className="flex-1 space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-2 min-h-[60px]">
                        {selectedDayActivities.length > 0 ? (
                            selectedDayActivities.map((activity) => {
                                const timeStr = activity.hora ? activity.hora.substring(0, 5) : "";
                                return (
                                    <div key={activity.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/[0.08] transition-all">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", colors.bg)} />
                                        <span className="text-xs text-foreground/80 flex-1 truncate">{activity.titulo}</span>
                                        {timeStr && <span className="text-[9px] text-muted-foreground font-mono">{timeStr}</span>}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-4 text-center border border-dashed border-white/10 rounded-2xl opacity-40">
                                <p className="text-[9px] italic">Nenhuma {type === 'meta' ? 'rotina' : 'ação'} para este dia</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder={type === 'meta' ? "Adicionar rotina..." : "Adicionar ação..."}
                                className={cn("flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none transition-all placeholder:opacity-50", `focus:ring-1 focus:ring-${colors.accent}-500/30`)}
                                value={newActivityTitle}
                                onChange={(e) => setNewActivityTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddActivity();
                                }}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-xl border border-white/5 transition-all outline-none",
                                    showOptions ? cn(colors.bgOpacity20, colors.text, colors.border30) : "hover:bg-white/5 text-muted-foreground"
                                )}
                                onClick={() => setShowOptions(!showOptions)}
                            >
                                <Clock className="w-4 h-4" />
                            </Button>
                            <Button
                                size="icon"
                                className={cn(colors.bg, colors.bgHover, "text-white rounded-xl h-8 w-8 shrink-0 disabled:opacity-30")}
                                onClick={handleAddActivity}
                                disabled={isAdding || !newActivityTitle.trim()}
                            >
                                {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                        </div>

                        {showOptions && (
                            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-5 animate-in zoom-in-95 duration-200 shadow-xl overflow-visible">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                                    <div className="flex-1 flex gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                        {(['none', 'daily', 'weekly'] as const).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setFrequency(f)}
                                                className={cn(
                                                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                                                    frequency === f
                                                        ? cn(colors.bg, "text-white ring-1 ring-white/20", colors.shadowBtn)
                                                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                {f === 'none' ? 'Única' : f === 'daily' ? 'Diária' : 'Semanal'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 px-3 py-2 bg-black/40 rounded-2xl border border-white/5 sm:w-auto">
                                        <Clock className={cn("w-3.5 h-3.5", colors.text, "opacity-50")} />
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className={cn("bg-transparent border-none text-xs font-mono outline-none w-20 [color-scheme:dark]", colors.text)}
                                        />
                                    </div>
                                </div>

                                {frequency === 'weekly' && (
                                    <div className="flex flex-wrap justify-between gap-2 p-1">
                                        {daysOfWeek.map((day) => (
                                            <button
                                                key={day.value}
                                                onClick={() => toggleDay(day.value)}
                                                className={cn(
                                                    "w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-bold transition-all duration-300 border flex items-center justify-center",
                                                    selectedDays.includes(day.value)
                                                        ? cn(colors.bg, "text-white border-white/20 shadow-lg")
                                                        : "bg-white/5 text-muted-foreground border-white/5 hover:border-white/20 hover:bg-white/10"
                                                )}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function IdeiaInbox() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { brand, updateBrand } = useBrand();
    const { settings, getSetting, isLoading: isLoadingSettings } = useSystemSettings();

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
    const [editingIdea, setEditingIdea] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSelectingWeek, setIsSelectingWeek] = useState(false);
    const [targetWeekForLink, setTargetWeekForLink] = useState<number | null>(null);
    const [generatingField, setGeneratingField] = useState<string | null>(null);
    const [allocationDraft, setAllocationDraft] = useState<{
        week: number;
        type: "feed" | "stories";
        intention: string;
    } | null>(null);
    const [folderSearchQuery, setFolderSearchQuery] = useState("");

    const [isTriageFolderOpen, setIsTriageFolderOpen] = useState(false);
    const [isDetailFolderOpen, setIsDetailFolderOpen] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successData, setSuccessData] = useState<{ week: number; day: string; type: string } | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);

    const triggerFeedback = () => {
        if (navigator.vibrate) navigator.vibrate(200);
        setShowFeedback(true);
        setTimeout(() => setShowFeedback(false), 2000);
    };

    const getFolderConfig = (folderName: string) => {
        return FOLDERS.find(f => f.name === folderName) || { name: folderName || "Insights", color: "#EAB308" };
    };

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, []);

    useEffect(() => {
        fetchIdeas();
    }, [user]);

    useEffect(() => {
        setEditingIdea(null);
        setIsSelectingWeek(false);
        setTargetWeekForLink(null);
        setAllocationDraft(null);
    }, [selectedIdea]);

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
        // Cleanup MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            // Remove onstop handler to prevent auto-transcription if we already have text
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }

        // Cleanup Timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Cleanup SpeechRecognition
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        setIsListening(false);
        setInboxState("processing");

        // Use SpeechRecognition result if available, otherwise fallback to silence/error handling
        setTimeout(() => {
            if (transcript) {
                setEditingTranscript(transcript);
                analyzeIdea(transcript, 'normal', manualFolder);
            } else {
                setInboxState("initial");
                toast.error("Não entendi o que você disse.");
            }
        }, 500);
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

    const [manualFolder, setManualFolder] = useState<string | null>(null);

    const handleTextSubmit = async (text: string) => {
        if (!text.trim()) return;

        // If user selected a folder manually, use it effectively
        setIsProcessing(true);
        setEditingTranscript(text);

        // Pass the manual folder to analyzeIdea to prioritize it or force it
        await analyzeIdea(text, 'normal', manualFolder);
    };

    // Update analyzeIdea signature to accept manualFolder
    const analyzeIdea = async (content: string, mode: 'normal' | 'rajada' = 'normal', forcedFolder: string | null = null) => {
        setInboxState("processing");
        setIsProcessing(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("API Key não configurada");

            const brandContext = brand ? `
                                                        Niche: ${brand.dna_nicho || 'Não definido'}
                                                        Produto: ${brand.dna_produto || 'Não definido'}
                                                        Objetivo: ${brand.dna_objetivo || 'Não definido'}
                                                        Essência: ${brand.result_essencia || 'Não definida'}
                                                        Pilares: ${brand.dna_pilares?.map((p: any) => p.name || p).join(', ') || 'Não definidos'}
                                                        ` : '';

            const folderInstruction = forcedFolder
                ? `O usuário JÁ selecionou a pasta: "${forcedFolder}". OBRIGATORIAMENTE use "suggested_destination": "${forcedFolder}" e ajuste a "category" para a mais compatível com esta pasta.`
                : `Analise e escolha a melhor pasta baseada no conteúdo.`;

            const prompt = `Você é a Yah, uma assistente de estratégia para mentes atípicas.
                                                        Sua tarefa é analisar a ideia do usuário e organizá-la seguindo regras estritas.

                                                        CONTEXTO DO USUÁRIO:
                                                        ${brandContext}

                                                        MODO: ${mode}
                                                        CONTEÚDO PARA ANÁLISE: "${content}"
                                                        INSTRUÇÃO DE PASTA: ${folderInstruction}

                                                        REGRAS DE CATEGORIZAÇÃO (OBRIGATÓRIO ESCOLHER UMA):
            - Conteúdo (conteudo) -> Pasta: "Conteúdo"
            - Meta (meta) -> Pasta: "Metas"
            - Insight (insight) -> Pasta: "Insights"
            - Produto / serviço (produto) -> Pasta: "Produto / serviço"
            - Projeto (projeto) -> Pasta: "Projeto"
            - Stand-by (standby) -> Pasta: "Stand-by"

                                                        IMPORTANTE: O campo "suggested_destination" DEVE ser exatamente o nome de uma das pastas acima. Nunca retorne "Sem Pasta".

                                                        REGRAS DE SAÍDA POR CATEGORIA:

                                                        1. Se categoria = "conteudo":
                                                        Gere "sugestao_conteudo" com: semana_ideal (1-4), dia_ideal, formato_feed, formato_stories, headline, micro_headline, intencao_conteudo (identificação, educação, etc), mini_roteiro (array de passos) e observacoes.

                                                        2. Se categoria = "meta":
                                                        Gere "sugestao_meta" com: descricao_meta, unidade, valor_alvo, checklist_passos (3-7 passos) e sugestao_inicio_calendario.

                                                        3. Se categoria = "insight":
                                                        Gere "sugestao_insight" com: descricao_regra, como_influencia_yah (array de strings) e formatos_afetados (array).

                                                        4. Se categoria = "projeto":
                                                        Gere "sugestao_projeto" com os 10 campos estratégicos para planejamento de projeto:
                                                        - visao: Descrição da visão de futuro do projeto.
                                                        - objetivo: O que se pretende alcançar com clareza.
                                                        - estrutura: Como o projeto será organizado/fases.
                                                        - acoes: Lista de ações práticas imediatas.
                                                        - execucao: Plano prático para o dia a dia.
                                                        - organizacao: Processos para manter a ordem.
                                                        - recursos: O que é necessário (ferramentas, pessoas, investimento).
                                                        - comunicacao: Como será divulgado, vendido ou explicado.
                                                        - metricas: Como medir o sucesso e progresso.
                                                        - ajustes: Pontos de atenção e possíveis correções.

                                                        5. Se categoria = "produto":
                                                        Gere "sugestao_produto" com os 10 campos estratégicos para definição de oferta:
                                                        - nome: Nome do Produto / Serviço.
                                                        - categoria_produto: Categoria do produto ou serviço.
                                                        - o_que_e: O que é (descrição curta).
                                                        - problema: Problema que resolve.
                                                        - solucao: Solução / Abordagem.
                                                        - entregaveis: Entregáveis / Componentes do serviço.
                                                        - publico_ideal: Público ideal.
                                                        - preco_entrega: Preço e forma de entrega.
                                                        - argumentos_valor: Array com exatamente 3 argumentos de valor.
                                                        - promessa: A promessa em uma frase.

                                                        MODO RAJADA:
                                                        Se modo = "rajada", separe o conteúdo em itens individuais. Cada item deve ter "id_interno", "trecho_original" e sua própria análise completa.

                                                        FORMATO DE RETORNO (JSON):
                                                        {
                                                            "modo": "${mode}",
                                                        ${mode === 'rajada' ? '"itens": [ ... ]' : `
                "category": "conteudo" | "meta" | "insight" | "produto" | "projeto" | "standby",
                "title": "string",
                "summary": "string",
                "suggested_destination": "string (Pasta correspondente)",
                "ai_insights": "string",
                "is_urgent": boolean,
                "sugestao_conteudo": { ... },
                "sugestao_meta": {
                    "descricao_meta": "string",
                    "sugestao_inicio_calendario": "string",
                    "checklist_passos": ["string"],
                    "plano_estrategico": "string",
                    "plano_acoes": "string",
                    "rotinas": "string"
                },
                "sugestao_insight": { ... },
                "sugestao_produto": {
                    "nome": "string",
                    "categoria_produto": "string",
                    "o_que_e": "string",
                    "problema": "string",
                    "solucao": "string",
                    "entregaveis": "string",
                    "publico_ideal": "string",
                    "preco_entrega": "string",
                    "argumentos_valor": ["string"],
                    "promessa": "string"
                },
                "sugestao_projeto": {
                    "visao": "string",
                    "objetivo": "string",
                    "estrutura": "string",
                    "acoes": "string",
                    "execucao": "string",
                    "organizacao": "string",
                    "recursos": "string",
                    "comunicacao": "string",
                    "metricas": "string",
                    "ajustes": "string"
                },
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

            // Force the folder if provided manually
            if (forcedFolder) {
                result.suggested_destination = forcedFolder;
            }

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

    const handleGenerateProjectField = async (fieldKey: string, fieldLabel: string, isFromDetail: boolean = false) => {
        const apiKey = getSetting('openai_api_key')?.value;
        if (!apiKey || !apiKey.startsWith('sk-')) {
            toast.error("Configure sua chave OpenAI válida nas configurações.");
            return;
        }

        const currentSource = isFromDetail ? (editingIdea || selectedIdea) : { metadata: analysisResult, content: editingTranscript };
        if (!currentSource) return;

        const metadata = currentSource.metadata || {};
        const title = metadata.title || "Projeto sem título";
        const summary = metadata.summary || (isFromDetail ? (currentSource as any).content : editingTranscript) || "Sem descrição";
        const sugestao_projeto = metadata.sugestao_projeto || {};

        setGeneratingField(fieldKey);
        try {
            const prompt = `Você é a Yah, especialista em estratégia.
                                                        Gere uma sugestão curta, direta e estratégica para o campo "${fieldLabel}" de um projeto.

                                                        TÍTULO DO PROJETO: ${title}
                                                        RESUMO/CONTEXTO: ${summary}

                                                        OUTROS CAMPOS JÁ DEFINIDOS (use como contexto se necessário):
                                                        ${Object.entries(sugestao_projeto)
                    .filter(([key, val]) => key !== fieldKey && val)
                    .map(([key, val]) => `- ${key}: ${val}`)
                    .join('\n')}

                                                        Regra de ouro: Seja específico, não genérico. Use tom de voz encorajador mas profissional.
                                                        Retorne APENAS o texto da sugestão para este campo específico, em no máximo 3 parágrafos curtos ou lista de tópicos.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Expert em estratégia para mentes atípicas." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            const content = data.choices[0].message.content.trim();

            if (isFromDetail) {
                const updated = {
                    ...currentSource,
                    metadata: {
                        ...metadata,
                        sugestao_projeto: { ...sugestao_projeto, [fieldKey]: content }
                    }
                };
                setEditingIdea(updated);
            } else {
                setAnalysisResult({
                    ...analysisResult,
                    sugestao_projeto: { ...sugestao_projeto, [fieldKey]: content }
                });
            }
            toast.success(`${fieldLabel} atualizado com IA!`);
        } catch (error: any) {
            toast.error("Erro ao gerar campo: " + error.message);
        } finally {
            setGeneratingField(null);
        }
    };

    const handleGenerateProductField = async (fieldKey: string, fieldLabel: string, isFromDetail: boolean = false, customIndex?: number) => {
        const apiKey = getSetting('openai_api_key')?.value;
        if (!apiKey || !apiKey.startsWith('sk-')) {
            toast.error("Configure sua chave OpenAI válida nas configurações.");
            return;
        }

        const currentSource = isFromDetail ? (editingIdea || selectedIdea) : { metadata: analysisResult, content: editingTranscript };
        if (!currentSource) return;

        const metadata = currentSource.metadata || {};
        const title = metadata.title || "Produto/Serviço sem título";
        const summary = metadata.summary || (isFromDetail ? (currentSource as any).content : editingTranscript) || "Sem descrição";
        const sugestao_produto = metadata.sugestao_produto || {};
        const customFields = sugestao_produto.custom_fields || [];

        const targetFieldKey = customIndex !== undefined ? `custom_${customIndex}` : fieldKey;
        setGeneratingField(targetFieldKey);
        try {
            const prompt = `Você é a Yah, especialista em estratégia.
                                                        Gere uma sugestão curta, direta e estratégica para o campo "${fieldLabel}" de um produto ou serviço.

                                                        NOME DO PRODUTO: ${title}
                                                        RESUMO/CONTEXTO: ${summary}

                                                        OUTROS CAMPOS JÁ DEFINIDOS:
                                                        ${Object.entries(sugestao_produto)
                    .filter(([key, val]) => key !== 'custom_fields' && key !== fieldKey && val)
                    .map(([key, val]) => `- ${key}: ${val}`)
                    .join('\n')}
                                                        ${customFields.map((f: any) => `- ${f.label}: ${f.value}`).join('\n')}

                                                        Regra de ouro: Seja específico, não genérico. Use tom de voz encorajador mas profissional.
                                                        Se for "Argumentos de Valor", retorne exatamente 3 argumentos em formato de lista.
                                                        Retorne APENAS o texto da sugestão para este campo específico.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Expert em estratégia para mentes atípicas." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            let content = data.choices[0].message.content.trim();

            if (fieldKey === 'argumentos_valor') {
                content = content.split('\n').map((s: string) => s.replace(/^[0-9.-]\s*/, '').trim()).filter(Boolean).slice(0, 3);
            }

            if (isFromDetail) {
                const newMetadata = { ...metadata };
                if (customIndex !== undefined) {
                    const newCustom = [...customFields];
                    newCustom[customIndex] = { ...newCustom[customIndex], value: content };
                    newMetadata.sugestao_produto = { ...sugestao_produto, custom_fields: newCustom };
                } else {
                    newMetadata.sugestao_produto = { ...sugestao_produto, [fieldKey]: content };
                }
                setEditingIdea({ ...currentSource, metadata: newMetadata });
            } else {
                const newAnalysis = { ...analysisResult };
                if (customIndex !== undefined) {
                    const newCustom = [...customFields];
                    newCustom[customIndex] = { ...newCustom[customIndex], value: content };
                    newAnalysis.sugestao_produto = { ...sugestao_produto, custom_fields: newCustom };
                } else {
                    newAnalysis.sugestao_produto = { ...sugestao_produto, [fieldKey]: content };
                }
                setAnalysisResult(newAnalysis);
            }
            toast.success(`${fieldLabel} atualizado com IA!`);
        } catch (error: any) {
            toast.error("Erro ao gerar campo: " + error.message);
        } finally {
            setGeneratingField(null);
        }
    };

    const addCustomProductField = (isFromDetail: boolean = false) => {
        const currentSource = isFromDetail ? (editingIdea || selectedIdea) : { metadata: analysisResult };
        if (!currentSource) return;

        const metadata = currentSource.metadata || {};
        const sugestao_produto = metadata.sugestao_produto || {};
        const customFields = sugestao_produto.custom_fields || [];

        const newField = { label: "Novo Campo", value: "" };
        const updatedCustom = [...customFields, newField];

        if (isFromDetail) {
            setEditingIdea({
                ...currentSource,
                metadata: {
                    ...metadata,
                    sugestao_produto: { ...sugestao_produto, custom_fields: updatedCustom }
                }
            });
        } else {
            setAnalysisResult({
                ...analysisResult,
                sugestao_produto: { ...(analysisResult.sugestao_produto || {}), custom_fields: updatedCustom }
            });
        }
    };

    const saveIdeaDirectly = async () => {
        if (!editingTranscript) return;

        // Validate Folder
        const targetFolder = analysisResult?.suggested_destination;
        const isValidFolder = FOLDERS.some(f => f.name === targetFolder);

        if (!isValidFolder) {
            toast.error("Por favor, selecione uma pasta válida antes de salvar.");
            // Optionally open folder selector or highlight it
            return;
        }

        setIsProcessing(true);
        try {
            const { error } = await (supabase.from("idea_inbox" as any) as any).insert({
                user_id: user?.id,
                content: editingTranscript,
                category: analysisResult?.category || "folder",
                folder: targetFolder,
                metadata: analysisResult || {},
                status: "processed"
            });

            if (error) throw error;
            triggerFeedback();
            // toast.success("Ideia salva!");

            setSelectedFolder(targetFolder);
            setInboxState("folder_detail");

            fetchIdeas();
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const addToWeeklyPlan = async (targetWeek: number, contentType: "feed" | "stories", userIntention?: string) => {
        const ideaToUse = (inboxState === 'item_detail') ? (editingIdea || selectedIdea) : analysisResult;
        if (!brand || !ideaToUse || !user) return;

        setIsProcessing(true);
        try {
            const { data: latestBrand, error: fetchError } = await (supabase.from("brands" as any) as any)
                .select("weekly_structure_data")
                .eq("id", brand.id)
                .single();

            if (fetchError) throw fetchError;

            // Alignment with WeeklyFixedNotebook: top-level object with '0', '1', '2', '3' as keys
            const currentStructure = latestBrand.weekly_structure_data || {};

            const metadata = ideaToUse.metadata || ideaToUse;
            const sugg = metadata.sugestao_conteudo || {};
            const weekIdx = targetWeek - 1;

            const dayMapping: { [key: string]: number } = {
                "domingo": 0, "segunda": 1, "terça": 2, "terca": 2, "quarta": 3, "quinta": 4, "sexta": 5, "sábado": 6, "sabado": 6,
                "domingo-feira": 0, "segunda-feira": 1, "terça-feira": 2, "terca-feira": 2, "quarta-feira": 3, "quinta-feira": 4, "sexta-feira": 5, "sábado-feira": 6, "sabado-feira": 6
            };
            // Default to Monday (1) if day is missing or invalid
            const rawDay = (sugg?.dia_ideal || "segunda").toLowerCase();
            const dayIdx = dayMapping[rawDay] !== undefined ? dayMapping[rawDay] : 1;

            if (!currentStructure[weekIdx]) {
                currentStructure[weekIdx] = {};
            }
            if (!currentStructure[weekIdx][dayIdx]) {
                currentStructure[weekIdx][dayIdx] = { feed: {}, stories: {} };
            }

            const dayContent = currentStructure[weekIdx][dayIdx];
            const targetContent = dayContent[contentType] || {};

            const newBlock = {
                headline: sugg?.headline || metadata.title || ideaToUse.content?.substring(0, 50) || "Ideia sem título",
                format: (contentType === "feed" ? sugg?.formato_feed : sugg?.formato_stories) || (contentType === "feed" ? "Reels" : "Sequência"),
                intention: userIntention || sugg?.intencao_conteudo || "Conexão",
                notes: metadata.summary || ideaToUse.content || "",
                instruction: sugg?.mini_roteiro || "Transformar esta ideia em um post estratégico.",
                id: Date.now()
            };

            // If main block is empty, fill it. Else, add to extraBlocks.
            if (!targetContent.headline) {
                dayContent[contentType] = { ...targetContent, ...newBlock };
            } else {
                if (!targetContent.extraBlocks) targetContent.extraBlocks = [];
                targetContent.extraBlocks.push(newBlock);
            }

            const { error: updateError } = await (supabase.from("brands" as any) as any)
                .update({ weekly_structure_data: currentStructure })
                .eq("id", brand.id);

            if (updateError) throw updateError;

            setSuccessData({
                week: targetWeek,
                day: rawDay.charAt(0).toUpperCase() + rawDay.slice(1),
                type: contentType === "feed" ? "Feed" : "Stories"
            });
            setShowSuccessDialog(true);
            setIsSelectingWeek(false);
            setTargetWeekForLink(null);

            if (inboxState === 'triage') {
                await saveIdeaDirectly();
            } else {
                fetchIdeas();
            }

        } catch (error: any) {
            toast.error("Erro ao enviar: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // ... (rest of code)

    const handleStartAllocation = () => {
        // ... (existing handleStartAllocation code)
        const ideaToUse = (inboxState === 'item_detail') ? (editingIdea || selectedIdea) : analysisResult;
        if (!ideaToUse) return;

        const metadata = ideaToUse.metadata || ideaToUse;
        const sugg = metadata.sugestao_conteudo || {};

        setAllocationDraft({
            week: sugg.semana_ideal || 1,
            type: sugg.formato_stories ? "stories" : "feed",
            intention: sugg.intencao_conteudo || "Conexão"
        });
        setIsSelectingWeek(true);
    };

    const renderWeekSelection = () => {
        if (!allocationDraft) return null;

        return (
            <div className="space-y-4 p-4 bg-background/50 rounded-2xl border border-white/10 animate-in slide-in-from-top-2 duration-300">
                {/* ... (existing UI code) ... */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Sugestão da YAh</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase px-1">Selecione a Semana</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[1, 2, 3, 4].map(w => (
                                    <button
                                        key={w}
                                        onClick={() => setAllocationDraft({ ...allocationDraft, week: w })}
                                        className={cn(
                                            "h-9 rounded-lg text-[10px] font-bold transition-all border",
                                            allocationDraft.week === w
                                                ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                                : "bg-background/40 border-white/5 text-muted-foreground hover:bg-white/5"
                                        )}
                                    >
                                        S{w}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase px-1">Canal</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                        onClick={() => setAllocationDraft({ ...allocationDraft, type: "feed" })}
                                        className={cn(
                                            "h-9 rounded-lg flex items-center justify-center gap-1.5 border transition-all",
                                            allocationDraft.type === "feed"
                                                ? "bg-pink-500/20 border-pink-500/40 text-pink-400"
                                                : "bg-background/40 border-white/5 text-muted-foreground hover:bg-white/5"
                                        )}
                                    >
                                        <Instagram className="w-3 h-3" />
                                        <span className="text-[9px] font-bold uppercase">Feed</span>
                                    </button>
                                    <button
                                        onClick={() => setAllocationDraft({ ...allocationDraft, type: "stories" })}
                                        className={cn(
                                            "h-9 rounded-lg flex items-center justify-center gap-1.5 border transition-all",
                                            allocationDraft.type === "stories"
                                                ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                                                : "bg-background/40 border-white/5 text-muted-foreground hover:bg-white/5"
                                        )}
                                    >
                                        <MessageSquare className="w-3 h-3" />
                                        <span className="text-[9px] font-bold uppercase">St.</span>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase px-1">Intenção</label>
                                <select
                                    className="w-full h-9 bg-background/40 border border-white/5 rounded-lg text-[9px] font-bold uppercase px-2 focus:ring-1 focus:ring-primary/40 outline-none"
                                    value={allocationDraft.intention}
                                    onChange={(e) => setAllocationDraft({ ...allocationDraft, intention: e.target.value })}
                                >
                                    {["Conexão", "Autoridade", "Venda", "Educação", "Entretenimento"].map(i => (
                                        <option key={i} value={i} className="bg-background">{i}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                    <Button
                        size="sm"
                        className="w-full h-10 rounded-xl gradient-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg group"
                        onClick={() => addToWeeklyPlan(allocationDraft.week, allocationDraft.type, allocationDraft.intention)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Confirmar Envio
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    };

    const updateSavedIdea = async () => {
        if (!editingIdea) return;
        setIsProcessing(true);
        try {
            const { error } = await (supabase.from("idea_inbox" as any) as any)
                .update({
                    content: editingIdea.content,
                    metadata: editingIdea.metadata,
                    category: editingIdea.category,
                    folder: editingIdea.folder
                })
                .eq("id", editingIdea.id);

            if (error) throw error;
            toast.success("Ideia atualizada!");
            setSelectedIdea(editingIdea);
            setSavedIdeas(prev => prev.map(i => i.id === editingIdea.id ? editingIdea : i));
            setEditingIdea(null);
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
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

    const handleShareToWhatsApp = () => {
        const idea = editingIdea || selectedIdea;
        if (!idea) return;

        const title = idea.metadata?.title || "Minha Ideia";
        const content = idea.content || "";
        const text = `*${title}*\n\n${content}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const filteredSearchIdeas = savedIdeas.filter(i =>
        i.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.metadata?.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderProcessing = () => (
        <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700 min-h-[400px]">
            <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Brain className="w-10 h-10 text-primary absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-4">
                <h3 className="text-2xl font-bold">Yah está processando...</h3>
                <p className="text-yellow-500 italic">Do pensamento → à estrutura.</p>
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-widest animate-pulse">
                    <span>Gerando insights estratégicos</span>
                    <span className="flex gap-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </span>
                </div>
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
                <AutoHeightTextarea
                    className="w-full bg-transparent border-none focus:ring-0 text-xl leading-relaxed italic selection:bg-primary/20"
                    value={editingTranscript}
                    onChange={(e: any) => setEditingTranscript(e.target.value)}
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
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tighter leading-none italic uppercase">Modo Rajada</h2>
                        <p className="text-muted-foreground text-sm sm:text-base">Processamos {analysisResult.itens.length} ideias simultaneamente.</p>
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
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tighter leading-none italic uppercase">Yah Triagem Inteligente</h2>
                    <p className="text-muted-foreground text-sm sm:text-base">Identificamos o melhor destino para seu insight.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl sm:px-0">
                    {/* Main Summary Card */}
                    <div className="p-4 sm:p-10 rounded-[32px] sm:rounded-[48px] bg-card/40 border border-white/5 shadow-2xl space-y-6 flex flex-col hover:border-primary/20 transition-all group">
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
                            <AutoHeightTextarea
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-lg text-xl sm:text-2xl font-bold leading-tight group-hover:text-primary transition-colors px-0 cursor-text"
                                value={analysisResult.title}
                                onChange={(e: any) => setAnalysisResult({ ...analysisResult, title: e.target.value })}
                            />
                            <AutoHeightTextarea
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-lg text-muted-foreground leading-relaxed px-0 cursor-text text-sm sm:text-base"
                                value={analysisResult.summary}
                                onChange={(e: any) => setAnalysisResult({ ...analysisResult, summary: e.target.value })}
                            />

                        </div>
                        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: getFolderConfig(analysisResult.suggested_destination).color }}>Categoria: {getFolderConfig(analysisResult.suggested_destination).name}</span>

                            <div className="relative w-full sm:w-auto">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsTriageFolderOpen(!isTriageFolderOpen)}
                                    className="h-8 w-full sm:w-auto gap-2 rounded-full bg-secondary/50 hover:bg-secondary text-[10px] font-black uppercase tracking-widest px-3 border border-white/5 justify-between sm:justify-center"
                                >
                                    <Folder className="w-3 h-3" />
                                    {analysisResult.suggested_destination}
                                    <ChevronRight className={cn("w-3 h-3 opacity-50 transition-transform", isTriageFolderOpen && "rotate-90")} />
                                </Button>

                                {isTriageFolderOpen && (
                                    <div className="absolute bottom-full right-0 sm:right-0 mb-2 w-full sm:w-48 bg-card border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                        <div className="p-2 md:p-3 space-y-1">
                                            {FOLDERS.map(f => (
                                                <button
                                                    key={f.name}
                                                    onClick={() => {
                                                        setAnalysisResult({ ...analysisResult, suggested_destination: f.name });
                                                        setIsTriageFolderOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors hover:bg-primary/10 flex items-center gap-2",
                                                        analysisResult.suggested_destination === f.name ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <span className="text-base">{f.emoji}</span> {f.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Suggestion Details */}
                    <div className="space-y-6 sm:px-0">
                        {/* Original Content Box in Triage */}
                        {analysisResult.category !== 'projeto' && analysisResult.category !== 'produto' && analysisResult.suggested_destination !== 'Produto / serviço' && (
                            <div className="p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-card/60 border border-white/5 shadow-xl space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <ScrollText className="w-4 h-4" /> Conteúdo Original
                                </h4>
                                <AutoHeightTextarea
                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-xl text-sm leading-relaxed italic px-0 text-muted-foreground/80"
                                    value={editingTranscript}
                                    onChange={(e: any) => setEditingTranscript(e.target.value)}
                                />
                            </div>
                        )}

                        {analysisResult.category !== 'meta' && analysisResult.category !== 'projeto' && analysisResult.category !== 'produto' && analysisResult.suggested_destination !== 'Produto / serviço' && (
                            <div className="p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-card/60 border border-white/5 shadow-xl space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Conteúdo Adicional
                                </h4>
                                <AutoHeightTextarea
                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-xl text-sm leading-relaxed px-0 text-foreground/90"
                                    placeholder="Deseja adicionar algo mais?"
                                    value={analysisResult.additional_content || ""}
                                    onChange={(e: any) => setAnalysisResult({ ...analysisResult, additional_content: e.target.value })}
                                />
                            </div>
                        )}

                        {/* Projeto Planning Details in Triage */}
                        {analysisResult.category === 'projeto' && analysisResult.sugestao_projeto && (
                            <div className="p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-blue-500/5 border border-blue-500/10 space-y-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 flex items-center gap-2">
                                    <Rocket className="w-4 h-4" /> Planejamento Estratégico do Projeto
                                </h4>

                                <div className="grid grid-cols-1 gap-6">
                                    {[
                                        { key: 'visao', label: 'Visão', icon: Eye },
                                        { key: 'objetivo', label: 'Objetivo', icon: Target },
                                        { key: 'estrutura', label: 'Estrutura', icon: Layers },
                                        { key: 'acoes', label: 'Ações', icon: ListTodo },
                                        { key: 'execucao', label: 'Execução', icon: Play },
                                        { key: 'organizacao', label: 'Organização', icon: FolderSync },
                                        { key: 'recursos', label: 'Recursos', icon: Wrench },
                                        { key: 'comunicacao', label: 'Comunicação', icon: Megaphone },
                                        { key: 'metricas', label: 'Métricas', icon: BarChart3 },
                                        { key: 'ajustes', label: 'Ajustes', icon: Settings2 }
                                    ].map((field) => (
                                        <div key={field.key} className="space-y-3 p-4 sm:p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all group shadow-sm">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                                                <div className="flex items-center gap-2">
                                                    <field.icon className="w-4 h-4 text-blue-500/70 group-hover:text-blue-500 transition-colors" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-blue-500 transition-colors">{field.label}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={generatingField === field.key}
                                                    onClick={() => handleGenerateProjectField(field.key, field.label)}
                                                    className="h-8 px-4 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold transition-all text-[10px] uppercase tracking-widest gap-2 border border-blue-500/20 shadow-lg shadow-blue-500/5 active:scale-95 translate-y-[-2px]"
                                                >
                                                    {generatingField === field.key ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                    )}
                                                    {generatingField === field.key ? "GERANDO..." : "GERAR COM IA"}
                                                </Button>
                                            </div>
                                            <AutoHeightTextarea
                                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm leading-relaxed px-0 text-foreground/90 transition-all font-medium"
                                                placeholder={`Descreva a ${field.label.toLowerCase()}...`}
                                                value={(analysisResult.sugestao_projeto as any)[field.key] || ""}
                                                onChange={(e: any) => setAnalysisResult({
                                                    ...analysisResult,
                                                    sugestao_projeto: { ...analysisResult.sugestao_projeto, [field.key]: e.target.value }
                                                })}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <InboxActivityCalendar type="projeto" brandId={brand?.id} />
                            </div>
                        )}

                        {analysisResult.category === 'conteudo' && analysisResult.sugestao_conteudo && (
                            <div className="p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-primary/5 border border-primary/10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Plano de Conteúdo
                                    </h4>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{analysisResult.sugestao_conteudo.dia_ideal} • Semana {analysisResult.sugestao_conteudo.semana_ideal}</span>
                                </div>
                                <div className="space-y-2">
                                    <AutoHeightTextarea
                                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-lg text-lg font-bold leading-tight px-0"
                                        value={analysisResult.sugestao_conteudo.headline}
                                        onChange={(e: any) => setAnalysisResult({
                                            ...analysisResult,
                                            sugestao_conteudo: { ...analysisResult.sugestao_conteudo, headline: e.target.value }
                                        })}
                                    />
                                    <AutoHeightTextarea
                                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-lg text-xs text-muted-foreground italic px-0"
                                        value={analysisResult.sugestao_conteudo.micro_headline}
                                        onChange={(e: any) => setAnalysisResult({
                                            ...analysisResult,
                                            sugestao_conteudo: { ...analysisResult.sugestao_conteudo, micro_headline: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Roteiro Sugerido:</span>
                                    <div className="space-y-2">
                                        {analysisResult.sugestao_conteudo.mini_roteiro?.map((step: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-xs leading-relaxed group/item">
                                                <span className="text-primary font-bold mt-2">{i + 1}.</span>
                                                <AutoHeightTextarea
                                                    className="flex-1 bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-lg py-2 px-0 text-foreground/80"
                                                    value={step}
                                                    onChange={(e: any) => {
                                                        const newSteps = [...analysisResult.sugestao_conteudo.mini_roteiro];
                                                        newSteps[i] = e.target.value;
                                                        setAnalysisResult({
                                                            ...analysisResult,
                                                            sugestao_conteudo: { ...analysisResult.sugestao_conteudo, mini_roteiro: newSteps }
                                                        });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {analysisResult.category === 'meta' && analysisResult.sugestao_meta && (
                            <div className="p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-emerald-500/5 border border-emerald-500/10 space-y-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Plano de Meta
                                </h4>
                                <div className="space-y-1">
                                    <AutoHeightTextarea
                                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-xl font-bold px-0 text-emerald-500"
                                        value={analysisResult.sugestao_meta.descricao_meta}
                                        onChange={(e: any) => setAnalysisResult({
                                            ...analysisResult,
                                            sugestao_meta: { ...analysisResult.sugestao_meta, descricao_meta: e.target.value }
                                        })}
                                    />
                                    <div className="flex items-start gap-2 pb-6 border-b border-white/5">
                                        <span className="text-xs text-muted-foreground italic shrink-0 mt-2">Início sugerido:</span>
                                        <AutoHeightTextarea
                                            className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-xs text-muted-foreground italic px-0"
                                            value={analysisResult.sugestao_meta.sugestao_inicio_calendario}
                                            onChange={(e: any) => setAnalysisResult({
                                                ...analysisResult,
                                                sugestao_meta: { ...analysisResult.sugestao_meta, sugestao_inicio_calendario: e.target.value }
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-1 py-4 border-b border-white/5">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Plano Estratégico:</span>
                                        <AutoHeightTextarea
                                            className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-sm leading-relaxed px-0"
                                            placeholder="Defina a estratégia geral..."
                                            value={analysisResult.sugestao_meta.plano_estrategico || ""}
                                            onChange={(e: any) => setAnalysisResult({
                                                ...analysisResult,
                                                sugestao_meta: { ...analysisResult.sugestao_meta, plano_estrategico: e.target.value }
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-1 py-4 border-b border-white/5">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Plano de Ações:</span>
                                        <AutoHeightTextarea
                                            className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-sm leading-relaxed px-0"
                                            placeholder="Liste as ações práticas..."
                                            value={analysisResult.sugestao_meta.plano_acoes || ""}
                                            onChange={(e: any) => setAnalysisResult({
                                                ...analysisResult,
                                                sugestao_meta: { ...analysisResult.sugestao_meta, plano_acoes: e.target.value }
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-1 py-4 border-b border-white/5">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Rotinas:</span>
                                        <AutoHeightTextarea
                                            className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-sm leading-relaxed px-0"
                                            placeholder="Sugestões de rotina diária/semanal..."
                                            value={analysisResult.sugestao_meta.rotinas || ""}
                                            onChange={(e: any) => setAnalysisResult({
                                                ...analysisResult,
                                                sugestao_meta: { ...analysisResult.sugestao_meta, rotinas: e.target.value }
                                            })}
                                        />
                                    </div>

                                    {/* Custom Fields */}
                                    {analysisResult.sugestao_meta.custom_fields?.map((field: any, idx: number) => (
                                        <div key={field.id} className="space-y-1 py-4 border-b border-white/5 relative group">
                                            <div className="flex items-center justify-between">
                                                <input
                                                    className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest opacity-50 w-full p-0"
                                                    placeholder="TÍTULO DO CAMPO"
                                                    value={field.title}
                                                    onChange={(e) => {
                                                        const newFields = [...(analysisResult.sugestao_meta.custom_fields || [])];
                                                        newFields[idx].title = e.target.value;
                                                        setAnalysisResult({
                                                            ...analysisResult,
                                                            sugestao_meta: { ...analysisResult.sugestao_meta, custom_fields: newFields }
                                                        });
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newFields = analysisResult.sugestao_meta.custom_fields.filter((_: any, i: number) => i !== idx);
                                                        setAnalysisResult({
                                                            ...analysisResult,
                                                            sugestao_meta: { ...analysisResult.sugestao_meta, custom_fields: newFields }
                                                        });
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                                                >
                                                    <X className="w-3 h-3 text-muted-foreground" />
                                                </button>
                                            </div>
                                            <AutoHeightTextarea
                                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-sm leading-relaxed px-0"
                                                placeholder="Digite o conteúdo..."
                                                value={field.content}
                                                onChange={(e: any) => {
                                                    const newFields = [...(analysisResult.sugestao_meta.custom_fields || [])];
                                                    newFields[idx].content = e.target.value;
                                                    setAnalysisResult({
                                                        ...analysisResult,
                                                        sugestao_meta: { ...analysisResult.sugestao_meta, custom_fields: newFields }
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}

                                    <div className="pt-2">
                                        <button
                                            onClick={() => {
                                                const newFields = [...(analysisResult.sugestao_meta.custom_fields || []), { id: Date.now(), title: "", content: "" }];
                                                setAnalysisResult({
                                                    ...analysisResult,
                                                    sugestao_meta: { ...analysisResult.sugestao_meta, custom_fields: newFields }
                                                });
                                            }}
                                            className="text-xs text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" /> Adicionar campo extra
                                        </button>
                                    </div>
                                    <InboxActivityCalendar type="meta" brandId={brand?.id} />
                                </div>
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Checklist de Execução:</span>
                                    <div className="space-y-2">
                                        {analysisResult.sugestao_meta.checklist_passos?.map((step: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-xs items-start group/item">
                                                <div className="w-4 h-4 rounded-full border border-emerald-500/30 flex items-center justify-center text-[8px] text-emerald-500 font-bold shrink-0 mt-1">{i + 1}</div>
                                                <AutoHeightTextarea
                                                    className="flex-1 bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg py-1 px-0 text-foreground/80"
                                                    value={step}
                                                    onChange={(e: any) => {
                                                        const newSteps = [...analysisResult.sugestao_meta.checklist_passos];
                                                        newSteps[i] = e.target.value;
                                                        setAnalysisResult({
                                                            ...analysisResult,
                                                            sugestao_meta: { ...analysisResult.sugestao_meta, checklist_passos: newSteps }
                                                        });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {(analysisResult.category === 'produto' || analysisResult.suggested_destination === 'Produto / serviço') && (
                            <div className="p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-cyan-500/5 border border-cyan-500/10 space-y-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 flex items-center gap-2">
                                    <Rocket className="w-4 h-4" /> Definição do Produto / Serviço
                                </h4>

                                <div className="grid grid-cols-1 gap-6">
                                    {[
                                        { key: 'nome', label: '1. Nome do Produto / Serviço', icon: Tag },
                                        { key: 'categoria_produto', label: '2. Categoria', icon: Layers },
                                        { key: 'o_que_e', label: '3. O que é (descrição curta)', icon: FileText },
                                        { key: 'problema', label: '4. Problema que resolve', icon: Zap },
                                        { key: 'solucao', label: '5. Solução / Abordagem', icon: Brain },
                                        { key: 'entregaveis', label: '6. Entregáveis / Componentes', icon: ListTodo },
                                        { key: 'publico_ideal', label: '7. Público ideal', icon: Target },
                                        { key: 'preco_entrega', label: '8. Preço e forma de entrega', icon: Clock },
                                        { key: 'argumentos_valor', label: '9. Defina 3 argumentos de valor', icon: Sparkles, type: 'list' },
                                        { key: 'promessa', label: '10. Crie a promessa em uma frase', icon: Megaphone }
                                    ].map((field) => (
                                        <div key={field.key} className="space-y-3 p-4 sm:p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-all group shadow-sm">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                                                <div className="flex items-center gap-2">
                                                    <field.icon className="w-4 h-4 text-cyan-500/70 group-hover:text-cyan-500 transition-colors" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-cyan-500 transition-colors">{field.label}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={generatingField === field.key}
                                                    onClick={() => handleGenerateProductField(field.key, field.label)}
                                                    className="h-8 px-4 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-bold transition-all text-[10px] uppercase tracking-widest gap-2 border border-cyan-500/20"
                                                >
                                                    {generatingField === field.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                    {generatingField === field.key ? "GERANDO..." : "Sugerir com IA"}
                                                </Button>
                                            </div>

                                            {field.type === 'list' ? (
                                                <div className="space-y-2">
                                                    {((analysisResult.sugestao_produto as any)[field.key] || ["", "", ""]).map((item: string, i: number) => (
                                                        <div key={i} className="flex gap-2 items-center">
                                                            <span className="text-cyan-500 font-bold text-xs">{i + 1}.</span>
                                                            <input
                                                                className="flex-1 bg-transparent border-b border-white/5 focus:border-cyan-500/50 outline-none text-sm py-1"
                                                                value={item}
                                                                onChange={(e) => {
                                                                    const newList = [...((analysisResult.sugestao_produto as any)[field.key] || ["", "", ""])];
                                                                    newList[i] = e.target.value;
                                                                    setAnalysisResult({
                                                                        ...analysisResult,
                                                                        sugestao_produto: { ...analysisResult.sugestao_produto, [field.key]: newList }
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <AutoHeightTextarea
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-cyan-500/20 rounded-lg text-sm leading-relaxed px-0 text-foreground/90 transition-all font-medium"
                                                    placeholder={`Preencha ${field.label.toLowerCase()}...`}
                                                    value={(analysisResult.sugestao_produto as any)[field.key] || ""}
                                                    onChange={(e: any) => setAnalysisResult({
                                                        ...analysisResult,
                                                        sugestao_produto: { ...analysisResult.sugestao_produto, [field.key]: e.target.value }
                                                    })}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    {/* Custom Fields */}
                                    {((analysisResult.sugestao_produto as any)?.custom_fields || []).map((field: any, idx: number) => (
                                        <div key={`custom-${idx}`} className="space-y-3 p-4 sm:p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-all group shadow-sm">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                                                <div className="flex items-center gap-2">
                                                    <Plus className="w-4 h-4 text-cyan-500/70 group-hover:text-cyan-500 transition-colors" />
                                                    <input
                                                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-cyan-500 transition-colors bg-transparent border-none outline-none focus:ring-0 w-full"
                                                        value={field.label}
                                                        onChange={(e) => {
                                                            const newCustom = [...(analysisResult.sugestao_produto?.custom_fields || [])];
                                                            newCustom[idx] = { ...newCustom[idx], label: e.target.value };
                                                            setAnalysisResult({
                                                                ...analysisResult,
                                                                sugestao_produto: { ...analysisResult.sugestao_produto, custom_fields: newCustom }
                                                            });
                                                        }}
                                                    />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={generatingField === `custom_${idx}`}
                                                    onClick={() => handleGenerateProductField('custom', field.label, false, idx)}
                                                    className="h-8 px-4 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-bold transition-all text-[10px] uppercase tracking-widest gap-2 border border-cyan-500/20"
                                                >
                                                    {generatingField === `custom_${idx}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                    {generatingField === `custom_${idx}` ? "GERANDO..." : "Sugerir com IA"}
                                                </Button>
                                            </div>

                                            <AutoHeightTextarea
                                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-cyan-500/20 rounded-lg text-sm leading-relaxed px-0 text-foreground/90 transition-all font-medium"
                                                placeholder={`Preencha ${field.label.toLowerCase()}...`}
                                                value={field.value || ""}
                                                onChange={(e: any) => {
                                                    const newCustom = [...(analysisResult.sugestao_produto?.custom_fields || [])];
                                                    newCustom[idx] = { ...newCustom[idx], value: e.target.value };
                                                    setAnalysisResult({
                                                        ...analysisResult,
                                                        sugestao_produto: { ...analysisResult.sugestao_produto, custom_fields: newCustom }
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}

                                    <Button
                                        variant="outline"
                                        onClick={() => addCustomProductField(false)}
                                        className="w-full h-14 rounded-2xl border-dashed border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5 text-cyan-500 font-bold flex items-center justify-center gap-2 transition-all mt-4"
                                    >
                                        <Plus className="w-5 h-5" /> Adicionar Campo Personalizado
                                    </Button>
                                </div>
                            </div>
                        )}

                        {analysisResult.category === 'insight' && analysisResult.sugestao_insight && (
                            <div className="p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-amber-500/5 border border-amber-500/10 space-y-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> Regra do Insight
                                </h4>
                                <AutoHeightTextarea
                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-amber-500/20 rounded-lg text-lg font-bold leading-tight italic px-0 text-amber-500"
                                    value={analysisResult.sugestao_insight.descricao_regra}
                                    onChange={(e: any) => setAnalysisResult({
                                        ...analysisResult,
                                        sugestao_insight: { ...analysisResult.sugestao_insight, descricao_regra: e.target.value }
                                    })}
                                />
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Impacto no Sistema:</span>
                                    <div className="space-y-2">
                                        {analysisResult.sugestao_insight.como_influencia_yah?.map((impact: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-xs italic text-foreground/70 group/item">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                                                <AutoHeightTextarea
                                                    className="flex-1 bg-transparent border-none focus:ring-1 focus:ring-amber-500/20 rounded-lg py-1 px-0 text-foreground/70 italic"
                                                    value={impact}
                                                    onChange={(e: any) => {
                                                        const newImpacts = [...analysisResult.sugestao_insight.como_influencia_yah];
                                                        newImpacts[i] = e.target.value;
                                                        setAnalysisResult({
                                                            ...analysisResult,
                                                            sugestao_insight: { ...analysisResult.sugestao_insight, como_influencia_yah: newImpacts }
                                                        });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Fallback AI Insight if no specific category suggestion */}
                        {(!analysisResult.sugestao_conteudo && !analysisResult.sugestao_meta && !analysisResult.sugestao_insight && !analysisResult.sugestao_produto) && (
                            <div className="p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-primary/5 border border-primary/10 space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Brain className="w-4 h-4" /> AI Insight
                                </h4>
                                <p className="text-sm italic leading-relaxed text-foreground/80">"{analysisResult.ai_insights}"</p>
                            </div>
                        )}

                        <div className="space-y-4 w-full">
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setInboxState("initial")}
                                    className="h-14 rounded-2xl font-bold border-white/5 hover:bg-white/5"
                                >
                                    Descartar
                                </Button>
                                <Button
                                    onClick={saveIdeaDirectly}
                                    className="h-14 rounded-2xl gradient-primary text-white font-bold shadow-xl"
                                >
                                    Salvar Ideia
                                </Button>
                            </div>

                            {/* Special Action for Content: Send to Week */}
                            {(analysisResult.category === 'conteudo' || analysisResult.suggested_destination === 'Conteúdo') && (
                                <div className="pt-4 border-t border-white/5">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pl-1">Ações Rápidas</h4>
                                    <div className="space-y-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                if (isSelectingWeek) {
                                                    setIsSelectingWeek(false);
                                                } else {
                                                    handleStartAllocation();
                                                }
                                            }}
                                            className="w-full h-14 rounded-2xl border-white/5 hover:bg-white/5 hover:border-primary/20 hover:text-primary transition-all font-bold flex items-center justify-center gap-2 group"
                                        >
                                            <CalendarIcon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                                            {isSelectingWeek ? "Cancelar Seleção" : "Enviar para semana"}
                                        </Button>
                                        {isSelectingWeek && (
                                            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                                {renderWeekSelection()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        );
    };

    const renderSuccessPopup = () => {
        if (!showSuccessDialog || !successData) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="w-full max-w-sm bg-card border border-white/10 rounded-[40px] shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto relative">
                        <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-20" />
                        <Sparkles className="w-10 h-10 text-primary" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black italic uppercase tracking-tight text-foreground">Enviado com Sucesso!</h2>
                        <p className="text-muted-foreground text-sm font-medium">Sua ideia já está no cronograma.</p>
                    </div>

                    <div className="bg-secondary/30 rounded-3xl p-6 border border-white/5 space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                            <span>Destino</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-widest text-primary">Semana {successData.week}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground uppercase">{successData.type}</span>
                            </div>
                            <div className="text-xl font-bold text-foreground text-left">
                                {successData.day}
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => {
                            setShowSuccessDialog(false);
                            setInboxState("initial");
                            setSuccessData(null);
                        }}
                        className="w-full h-14 rounded-2xl gradient-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                        Continuar
                    </Button>
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
                                    <div className="w-12 h-12 flex items-center justify-center">
                                        <span className="text-2xl md:text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform select-none">{f.emoji}</span>
                                    </div>
                                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                        {count}
                                    </div>
                                </div>

                                <div className="space-y-1 w-full">
                                    <h4 className="text-lg sm:text-2xl font-black tracking-tight leading-none text-wrap break-words" style={{ color: f.color }}>{f.name}</h4>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight opacity-70 text-wrap break-words pr-2">{f.description}</p>
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
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tighter italic uppercase text-foreground leading-[0.9]">Me diga qual é a ideia.</h2>
                                <p className="text-muted-foreground text-sm sm:text-base px-6">
                                    Eu organizo depois.
                                </p>
                            </div>

                            <div className="w-full flex gap-3 p-3 bg-background/50 rounded-[24px] border border-white/10 shadow-inner focus-within:border-primary/50 transition-all">
                                <Search className="w-5 h-5 text-muted-foreground/50 ml-3 mt-3" />
                                <input
                                    type="text"
                                    placeholder="Ou digite sua ideia de produto, post..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 px-2 text-foreground text-base sm:text-lg placeholder:text-muted-foreground/30"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTextSubmit(e.currentTarget.value);
                                    }}
                                />
                                <Button
                                    size="icon"
                                    className="shrink-0 rounded-2xl h-10 w-10 sm:h-12 sm:w-12 gradient-primary shadow-lg"
                                    onClick={() => {
                                        const input = document.querySelector('input') as HTMLInputElement;
                                        handleTextSubmit(input.value);
                                    }}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                    )}
                                </Button>
                            </div>

                            {/* Folder Selector Pills */}
                            <div className="flex flex-wrap items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 mt-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 w-full text-center mb-1">
                                    {manualFolder ? "Pasta selecionada:" : "Selecione a pasta (opcional):"}
                                </span>
                                {FOLDERS.map(f => (
                                    <button
                                        key={f.name}
                                        onClick={() => setManualFolder(manualFolder === f.name ? null : f.name)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                                            manualFolder === f.name
                                                ? "bg-white text-black border-white scale-105 shadow-lg"
                                                : "bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10 hover:border-white/20"
                                        )}
                                        style={{ color: manualFolder === f.name ? undefined : f.color, borderColor: manualFolder === f.name ? undefined : `${f.color}20` }}
                                    >
                                        <span className="text-sm">{f.emoji}</span>
                                        {f.name}
                                    </button>
                                ))}
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
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getFolderConfig(idea.folder).color }} />
                                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: getFolderConfig(idea.folder).color }}>
                                                {getFolderConfig(idea.folder).name.toUpperCase()}
                                            </span>
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
                <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center glow-primary animate-pulse" onClick={stopRecording}>
                    <Mic className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -inset-4 border-2 border-primary/20 rounded-full animate-ping opacity-50" />
            </div>

            <div className="space-y-6">
                <div className="text-4xl font-mono font-black text-primary tracking-widest">
                    {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="min-h-[40px] px-8">
                    <p className="text-lg font-bold italic text-foreground/80 tracking-tight line-clamp-1">
                        {transcript || "YAh ouvindo você..."}
                    </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-primary font-black animate-pulse text-[10px] uppercase tracking-[0.3em]">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    Capturando Fluxo
                </div>
            </div>

            <Button onClick={stopRecording} className="rounded-full h-14 px-10 gradient-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95">
                Concluir
            </Button>
        </div>
    );

    const renderFolderDetail = () => {
        const filteredIdeas = savedIdeas.filter(i =>
            i.folder === selectedFolder && (
                folderSearchQuery === "" ||
                (i.metadata?.title || "").toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
                (i.content || "").toLowerCase().includes(folderSearchQuery.toLowerCase())
            )
        );
        return (
            <div className="w-full h-full space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Folder className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold">{selectedFolder}</h2>
                        <span className="text-sm text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">{filteredIdeas.length} itens</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => {
                        setInboxState("initial");
                        setFolderSearchQuery("");
                    }}>Voltar às Pastas</Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={`Buscar em ${selectedFolder}...`}
                        value={folderSearchQuery}
                        onChange={(e) => setFolderSearchQuery(e.target.value)}
                        className="w-full bg-secondary/30 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                    />
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
                                    <span
                                        className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest"
                                        style={{
                                            backgroundColor: `${getFolderConfig(idea.folder).color}20`,
                                            color: getFolderConfig(idea.folder).color
                                        }}
                                    >
                                        {getFolderConfig(idea.folder).name.toUpperCase()}
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

        const currentIdea = editingIdea || selectedIdea;
        const meta = currentIdea.metadata || {};

        return (
            <div className="w-full h-full space-y-8 animate-in zoom-in-95 duration-500 pb-20">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span
                                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                                    style={{
                                        backgroundColor: `${getFolderConfig(currentIdea.folder).color}10`,
                                        color: getFolderConfig(currentIdea.folder).color,
                                        borderColor: `${getFolderConfig(currentIdea.folder).color}20`
                                    }}
                                >
                                    {getFolderConfig(currentIdea.folder).name.toUpperCase()}
                                </span>
                                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(currentIdea.created_at), "eeee, dd MMMM HH:mm", { locale: ptBR })}
                                </div>
                            </div>

                            <AutoHeightTextarea
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-xl text-2xl sm:text-3xl font-black tracking-tight leading-tight px-0 py-2"
                                value={meta.title || "Sua Ideia"}
                                onChange={(e: any) => {
                                    const updated = { ...currentIdea, metadata: { ...meta, title: e.target.value } };
                                    setEditingIdea(updated);
                                }}
                            />
                        </div>

                        {currentIdea.category !== 'projeto' && currentIdea.category !== 'produto' && currentIdea.folder !== 'Produto / serviço' && (
                            <div className="p-8 rounded-[32px] bg-card/60 border border-white/5 shadow-xl space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <ScrollText className="w-4 h-4" /> Conteúdo Original
                                </h4>
                                <AutoHeightTextarea
                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-xl text-lg leading-relaxed italic px-0"
                                    value={currentIdea.content}
                                    onChange={(e: any) => {
                                        const updated = { ...currentIdea, content: e.target.value };
                                        setEditingIdea(updated);
                                    }}
                                />
                            </div>
                        )}

                        {currentIdea.category !== 'meta' && currentIdea.category !== 'projeto' && currentIdea.category !== 'produto' && currentIdea.folder !== 'Produto / serviço' && (
                            <div className="p-8 rounded-[32px] bg-card/40 border border-white/5 shadow-xl space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Conteúdo Adicional
                                </h4>
                                <AutoHeightTextarea
                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-xl text-base leading-relaxed text-foreground/80 px-0"
                                    placeholder="Adicione observações extras aqui..."
                                    value={meta.additional_content || ""}
                                    onChange={(e: any) => {
                                        const updated = {
                                            ...currentIdea,
                                            metadata: { ...meta, additional_content: e.target.value }
                                        };
                                        setEditingIdea(updated);
                                    }}
                                />
                            </div>
                        )}

                        {/* Projeto Planning Details in Detail View */}
                        {currentIdea.category === 'projeto' && meta.sugestao_projeto && (
                            <div className="p-8 rounded-[32px] bg-blue-500/5 border border-blue-500/10 space-y-8 shadow-2xl animate-in zoom-in-95 duration-500">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-blue-500 flex items-center gap-2">
                                    <Rocket className="w-5 h-5" /> Planejamento Estratégico do Projeto
                                </h4>

                                <div className="grid grid-cols-1 gap-6">
                                    {[
                                        { key: 'visao', label: 'Visão', icon: Eye },
                                        { key: 'objetivo', label: 'Objetivo', icon: Target },
                                        { key: 'estrutura', label: 'Estrutura', icon: Layers },
                                        { key: 'acoes', label: 'Ações', icon: ListTodo },
                                        { key: 'execucao', label: 'Execução', icon: Play },
                                        { key: 'organizacao', label: 'Organização', icon: FolderSync },
                                        { key: 'recursos', label: 'Recursos', icon: Wrench },
                                        { key: 'comunicacao', label: 'Comunicação', icon: Megaphone },
                                        { key: 'metricas', label: 'Métricas', icon: BarChart3 },
                                        { key: 'ajustes', label: 'Ajustes', icon: Settings2 }
                                    ].map((field) => (
                                        <div key={field.key} className="space-y-3 p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all group shadow-sm relative overflow-hidden">
                                            {generatingField === field.key && (
                                                <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center animate-in fade-in duration-300">
                                                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Sugerindo com IA...</span>
                                                </div>
                                            )}
                                            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-2 w-full sm:w-auto max-w-full">
                                                    <field.icon className="w-4 h-4 text-blue-500/70 group-hover:text-blue-500 transition-colors shrink-0" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-blue-500/70 transition-colors line-clamp-1">{field.label}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={generatingField === field.key}
                                                    onClick={() => handleGenerateProjectField(field.key, field.label, true)}
                                                    className="w-full sm:w-auto h-8 px-4 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold transition-all text-[10px] uppercase tracking-widest gap-2 border border-blue-500/20 shadow-lg shadow-blue-500/5 active:scale-95 translate-y-[-2px] justify-center"
                                                >
                                                    {generatingField === field.key ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                    )}
                                                    {generatingField === field.key ? "GERANDO..." : "GERAR COM IA"}
                                                </Button>
                                            </div>
                                            <AutoHeightTextarea
                                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-base leading-relaxed px-0 text-foreground/90 transition-all font-medium"
                                                placeholder={`Descreva a ${field.label.toLowerCase()}...`}
                                                value={(meta.sugestao_projeto as any)?.[field.key] || ""}
                                                onChange={(e: any) => {
                                                    const updated = {
                                                        ...currentIdea,
                                                        metadata: {
                                                            ...meta,
                                                            sugestao_projeto: { ...meta.sugestao_projeto, [field.key]: e.target.value }
                                                        }
                                                    };
                                                    setEditingIdea(updated);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <InboxActivityCalendar type="projeto" brandId={brand?.id} />
                            </div>
                        )}

                        {/* Category Specific suggestions inside Item Detail */}
                        {currentIdea.category === 'conteudo' && meta.sugestao_conteudo && (
                            <div className="p-8 rounded-[32px] bg-primary/5 border border-primary/10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Plano de Conteúdo
                                    </h4>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{meta.sugestao_conteudo.dia_ideal} • Semana {meta.sugestao_conteudo.semana_ideal}</span>
                                </div>
                                <div className="space-y-4">
                                    <AutoHeightTextarea
                                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-lg text-lg font-bold leading-tight px-0"
                                        value={meta.sugestao_conteudo.headline}
                                        onChange={(e: any) => {
                                            const updated = {
                                                ...currentIdea,
                                                metadata: {
                                                    ...meta,
                                                    sugestao_conteudo: { ...meta.sugestao_conteudo, headline: e.target.value }
                                                }
                                            };
                                            setEditingIdea(updated);
                                        }}
                                    />
                                    <AutoHeightTextarea
                                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-lg text-xs text-muted-foreground italic px-0"
                                        value={meta.sugestao_conteudo.micro_headline}
                                        onChange={(e: any) => {
                                            const updated = {
                                                ...currentIdea,
                                                metadata: {
                                                    ...meta,
                                                    sugestao_conteudo: { ...meta.sugestao_conteudo, micro_headline: e.target.value }
                                                }
                                            };
                                            setEditingIdea(updated);
                                        }}
                                    />

                                    <div className="space-y-2 pt-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Roteiro:</span>
                                        {meta.sugestao_conteudo.mini_roteiro?.map((step: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-xs leading-relaxed">
                                                <span className="text-primary font-bold mt-2">{i + 1}.</span>
                                                <AutoHeightTextarea
                                                    className="flex-1 bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-lg py-2 px-0 text-foreground/80"
                                                    value={step}
                                                    onChange={(e: any) => {
                                                        const newSteps = [...meta.sugestao_conteudo.mini_roteiro];
                                                        newSteps[i] = e.target.value;
                                                        const updated = {
                                                            ...currentIdea,
                                                            metadata: {
                                                                ...meta,
                                                                sugestao_conteudo: { ...meta.sugestao_conteudo, mini_roteiro: newSteps }
                                                            }
                                                        };
                                                        setEditingIdea(updated);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentIdea.category === 'meta' && meta.sugestao_meta && (
                            <div className="p-8 rounded-[32px] bg-emerald-500/5 border border-emerald-500/10 space-y-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Plano de Meta
                                </h4>
                                <div className="space-y-1">
                                    <AutoHeightTextarea
                                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-xl font-bold px-0 text-emerald-500"
                                        value={meta.sugestao_meta.descricao_meta}
                                        onChange={(e: any) => {
                                            const updated = {
                                                ...currentIdea,
                                                metadata: {
                                                    ...meta,
                                                    sugestao_meta: { ...meta.sugestao_meta, descricao_meta: e.target.value }
                                                }
                                            };
                                            setEditingIdea(updated);
                                        }}
                                    />
                                    <div className="flex items-start gap-2 pb-6 border-b border-white/5">
                                        <span className="text-xs text-muted-foreground italic shrink-0 mt-2">Início sugerido:</span>
                                        <AutoHeightTextarea
                                            className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-xs text-muted-foreground italic px-0"
                                            value={meta.sugestao_meta.sugestao_inicio_calendario}
                                            onChange={(e: any) => {
                                                const updated = {
                                                    ...currentIdea,
                                                    metadata: {
                                                        ...meta,
                                                        sugestao_meta: { ...meta.sugestao_meta, sugestao_inicio_calendario: e.target.value }
                                                    }
                                                };
                                                setEditingIdea(updated);
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2 py-4 border-b border-white/5">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Plano Estratégico:</span>
                                        <AutoHeightTextarea
                                            className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-sm leading-relaxed px-0"
                                            placeholder="Defina a estratégia geral..."
                                            value={meta.sugestao_meta.plano_estrategico || ""}
                                            onChange={(e: any) => {
                                                const updated = {
                                                    ...currentIdea,
                                                    metadata: {
                                                        ...meta,
                                                        sugestao_meta: { ...meta.sugestao_meta, plano_estrategico: e.target.value }
                                                    }
                                                };
                                                setEditingIdea(updated);
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2 py-4 border-b border-white/5">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Plano de Ações:</span>
                                        <AutoHeightTextarea
                                            className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-sm leading-relaxed px-0"
                                            placeholder="Liste as ações práticas..."
                                            value={meta.sugestao_meta.plano_acoes || ""}
                                            onChange={(e: any) => {
                                                const updated = {
                                                    ...currentIdea,
                                                    metadata: {
                                                        ...meta,
                                                        sugestao_meta: { ...meta.sugestao_meta, plano_acoes: e.target.value }
                                                    }
                                                };
                                                setEditingIdea(updated);
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2 py-4 border-b border-white/5">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Rotinas:</span>
                                        <AutoHeightTextarea
                                            className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-sm leading-relaxed px-0"
                                            placeholder="Sugestões de rotina diária/semanal..."
                                            value={meta.sugestao_meta.rotinas || ""}
                                            onChange={(e: any) => {
                                                const updated = {
                                                    ...currentIdea,
                                                    metadata: {
                                                        ...meta,
                                                        sugestao_meta: { ...meta.sugestao_meta, rotinas: e.target.value }
                                                    }
                                                };
                                                setEditingIdea(updated);
                                            }}
                                        />
                                    </div>
                                    <InboxActivityCalendar type="meta" brandId={brand?.id} />
                                </div>
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Checklist Final:</span>
                                    <div className="space-y-2">
                                        {meta.sugestao_meta.checklist_passos?.map((step: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-xs items-start group/item">
                                                <div className="w-4 h-4 rounded-full border border-emerald-500/30 flex items-center justify-center text-[8px] text-emerald-500 font-bold shrink-0 mt-1">{i + 1}</div>
                                                <AutoHeightTextarea
                                                    className="flex-1 bg-transparent border-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg py-1 px-0 text-foreground/80"
                                                    value={step}
                                                    onChange={(e: any) => {
                                                        const newSteps = [...meta.sugestao_meta.checklist_passos];
                                                        newSteps[i] = e.target.value;
                                                        const updated = {
                                                            ...currentIdea,
                                                            metadata: {
                                                                ...meta,
                                                                sugestao_meta: { ...meta.sugestao_meta, checklist_passos: newSteps }
                                                            }
                                                        };
                                                        setEditingIdea(updated);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {(currentIdea.category === 'produto' || currentIdea.folder === 'Produto / serviço') && (
                            <div className="p-8 rounded-[32px] bg-cyan-500/5 border border-cyan-500/10 space-y-8 shadow-2xl animate-in zoom-in-95 duration-500">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-500 flex items-center gap-2">
                                    <Rocket className="w-5 h-5" /> Definição do Produto / Serviço
                                </h4>

                                <div className="grid grid-cols-1 gap-6">
                                    {[
                                        { key: 'nome', label: '1. Nome do Produto / Serviço', icon: Tag },
                                        { key: 'categoria_produto', label: '2. Categoria', icon: Layers },
                                        { key: 'o_que_e', label: '3. O que é (descrição curta)', icon: FileText },
                                        { key: 'problema', label: '4. Problema que resolve', icon: Zap },
                                        { key: 'solucao', label: '5. Solução / Abordagem', icon: Brain },
                                        { key: 'entregaveis', label: '6. Entregáveis / Componentes', icon: ListTodo },
                                        { key: 'publico_ideal', label: '7. Público ideal', icon: Target },
                                        { key: 'preco_entrega', label: '8. Preço e forma de entrega', icon: Clock },
                                        { key: 'argumentos_valor', label: '9. Defina 3 argumentos de valor', icon: Sparkles, type: 'list' },
                                        { key: 'promessa', label: '10. Crie a promessa em uma frase', icon: Megaphone }
                                    ].map((field) => (
                                        <div key={field.key} className="space-y-3 p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-all group shadow-sm">
                                            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-start gap-2 max-w-full">
                                                    <field.icon className="w-4 h-4 text-cyan-500/70 group-hover:text-cyan-500 transition-colors shrink-0 mt-0.5 sm:mt-0" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-cyan-500/70 transition-colors leading-relaxed line-clamp-2 md:line-clamp-1 text-left">{field.label}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={generatingField === field.key}
                                                    onClick={() => handleGenerateProductField(field.key, field.label, true)}
                                                    className="w-full sm:w-auto h-8 px-4 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-bold transition-all text-[10px] uppercase tracking-widest gap-2 border border-cyan-500/20 justify-center"
                                                >
                                                    {generatingField === field.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                    {generatingField === field.key ? "GERANDO..." : "Sugerir com IA"}
                                                </Button>
                                            </div>

                                            {field.type === 'list' ? (
                                                <div className="space-y-2">
                                                    {(meta.sugestao_produto?.[field.key] || ["", "", ""]).map((item: string, i: number) => (
                                                        <div key={i} className="flex gap-2 items-center">
                                                            <span className="text-cyan-500 font-bold text-xs">{i + 1}.</span>
                                                            <input
                                                                className="flex-1 bg-transparent border-b border-white/5 focus:border-cyan-500/50 outline-none text-sm py-1"
                                                                value={item}
                                                                onChange={(e) => {
                                                                    const newList = [...(meta.sugestao_produto?.[field.key] || ["", "", ""])];
                                                                    newList[i] = e.target.value;
                                                                    setEditingIdea({
                                                                        ...currentIdea,
                                                                        metadata: {
                                                                            ...meta,
                                                                            sugestao_produto: { ...meta.sugestao_produto, [field.key]: newList }
                                                                        }
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <AutoHeightTextarea
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-cyan-500/20 rounded-lg text-base leading-relaxed px-0 text-foreground/90 transition-all font-medium"
                                                    placeholder={`Preencha ${field.label.toLowerCase()}...`}
                                                    value={meta.sugestao_produto?.[field.key] || ""}
                                                    onChange={(e: any) => {
                                                        setEditingIdea({
                                                            ...currentIdea,
                                                            metadata: {
                                                                ...meta,
                                                                sugestao_produto: { ...meta.sugestao_produto, [field.key]: e.target.value }
                                                            }
                                                        });
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    {/* Custom Fields */}
                                    {(meta.sugestao_produto?.custom_fields || []).map((field: any, idx: number) => (
                                        <div key={`custom-${idx}`} className="space-y-3 p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-all group shadow-sm">
                                            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <Plus className="w-4 h-4 text-cyan-500/70 group-hover:text-cyan-500 transition-colors shrink-0" />
                                                    <input
                                                        className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-cyan-500/70 transition-colors bg-transparent border-none outline-none focus:ring-0 w-full"
                                                        value={field.label}
                                                        onChange={(e) => {
                                                            const newCustom = [...(meta.sugestao_produto?.custom_fields || [])];
                                                            newCustom[idx] = { ...newCustom[idx], label: e.target.value };
                                                            setEditingIdea({
                                                                ...currentIdea,
                                                                metadata: {
                                                                    ...meta,
                                                                    sugestao_produto: { ...meta.sugestao_produto, custom_fields: newCustom }
                                                                }
                                                            });
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={generatingField === `custom_${idx}`}
                                                        onClick={() => handleGenerateProductField('custom', field.label, true, idx)}
                                                        className="flex-1 sm:flex-none h-8 px-4 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-bold transition-all text-[10px] uppercase tracking-widest gap-2 border border-cyan-500/20 justify-center"
                                                    >
                                                        {generatingField === `custom_${idx}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                        {generatingField === `custom_${idx}` ? "GERANDO..." : "Sugerir com IA"}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            const newCustom = [...(meta.sugestao_produto?.custom_fields || [])];
                                                            newCustom.splice(idx, 1);
                                                            setEditingIdea({
                                                                ...currentIdea,
                                                                metadata: {
                                                                    ...meta,
                                                                    sugestao_produto: { ...meta.sugestao_produto, custom_fields: newCustom }
                                                                }
                                                            });
                                                        }}
                                                        className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors border border-red-500/20 shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <AutoHeightTextarea
                                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-cyan-500/20 rounded-lg text-base leading-relaxed px-0 text-foreground/90 transition-all font-medium"
                                                placeholder={`Preencha ${field.label.toLowerCase()}...`}
                                                value={field.value || ""}
                                                onChange={(e: any) => {
                                                    const newCustom = [...(meta.sugestao_produto?.custom_fields || [])];
                                                    newCustom[idx] = { ...newCustom[idx], value: e.target.value };
                                                    setEditingIdea({
                                                        ...currentIdea,
                                                        metadata: {
                                                            ...meta,
                                                            sugestao_produto: { ...meta.sugestao_produto, custom_fields: newCustom }
                                                        }
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}

                                    <Button
                                        variant="outline"
                                        onClick={() => addCustomProductField(true)}
                                        className="w-full h-14 rounded-2xl border-dashed border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5 text-cyan-500 font-bold flex items-center justify-center gap-2 transition-all mt-4"
                                    >
                                        <Plus className="w-5 h-5" /> Adicionar Campo Personalizado
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentIdea.category === 'insight' && meta.sugestao_insight && (
                            <div className="p-8 rounded-[32px] bg-amber-500/5 border border-amber-500/10 space-y-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> Regra do Insight
                                </h4>
                                <AutoHeightTextarea
                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-amber-500/20 rounded-lg text-lg font-bold leading-tight italic px-0 text-amber-500"
                                    value={meta.sugestao_insight.descricao_regra}
                                    onChange={(e: any) => {
                                        const updated = {
                                            ...currentIdea,
                                            metadata: {
                                                ...meta,
                                                sugestao_insight: { ...meta.sugestao_insight, descricao_regra: e.target.value }
                                            }
                                        };
                                        setEditingIdea(updated);
                                    }}
                                />
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Impacto:</span>
                                    <div className="space-y-2">
                                        {meta.sugestao_insight.como_influencia_yah?.map((impact: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-xs italic text-foreground/70 group/item">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                                                <AutoHeightTextarea
                                                    className="flex-1 bg-transparent border-none focus:ring-1 focus:ring-amber-500/20 rounded-lg py-1 px-0 text-foreground/70 italic"
                                                    value={impact}
                                                    onChange={(e: any) => {
                                                        const newImpacts = [...meta.sugestao_insight.como_influencia_yah];
                                                        newImpacts[i] = e.target.value;
                                                        const updated = {
                                                            ...currentIdea,
                                                            metadata: {
                                                                ...meta,
                                                                sugestao_insight: { ...meta.sugestao_insight, como_influencia_yah: newImpacts }
                                                            }
                                                        };
                                                        setEditingIdea(updated);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {(!meta.sugestao_conteudo && !meta.sugestao_meta && !meta.sugestao_insight && !meta.sugestao_produto && meta.ai_insights) && (
                            <div className="p-8 rounded-[32px] bg-primary/5 border border-primary/20 space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> AI Insights & Sugestões
                                </h3>
                                <AutoHeightTextarea
                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary/20 rounded-xl text-foreground/90 leading-relaxed px-0"
                                    value={meta.ai_insights}
                                    onChange={(e: any) => {
                                        const updated = {
                                            ...currentIdea,
                                            metadata: { ...meta, ai_insights: e.target.value }
                                        };
                                        setEditingIdea(updated);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-72 space-y-4">
                        {editingIdea && (
                            <Button
                                onClick={updateSavedIdea}
                                disabled={isProcessing}
                                className="w-full h-14 rounded-2xl gradient-primary text-white font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                Salvar Alterações
                            </Button>
                        )}

                        <Card className="p-4 space-y-3 bg-secondary/20 border-none relative overflow-hidden">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ações Rápidas</h4>

                            {currentIdea.folder === "Conteúdo" && (
                                <div className="space-y-2">
                                    <Button
                                        onClick={handleStartAllocation}
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start gap-3 rounded-xl h-12 border-border/50 transition-all",
                                            isSelectingWeek && "bg-primary/10 border-primary/30"
                                        )}
                                    >
                                        <CalendarIcon className="w-4 h-4 text-primary" />
                                        {isSelectingWeek ? "Cancelar" : "Enviar para semana"}
                                    </Button>

                                    {isSelectingWeek && renderWeekSelection()}
                                </div>
                            )}

                            <Button
                                className="w-full justify-start gap-3 rounded-xl h-12 bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-[1.02] active:scale-95"
                                onClick={handleShareToWhatsApp}
                            >
                                <MessageCircle className="w-4 h-4" /> Compartilhar no WhatsApp
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
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsDetailFolderOpen(!isDetailFolderOpen)}
                                    className="w-full justify-start gap-3 rounded-xl h-12 border-border/50 bg-card font-bold text-sm"
                                >
                                    <Folder className="w-4 h-4 text-primary" />
                                    {currentIdea.folder || "Sem Pasta"}
                                </Button>

                                {isDetailFolderOpen && (
                                    <div className="absolute bottom-full left-0 mb-2 w-full bg-card border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                        <div className="p-2 md:p-3 space-y-1">
                                            {FOLDERS.map(f => (
                                                <button
                                                    key={f.name}
                                                    onClick={() => {
                                                        const updated = { ...currentIdea, folder: f.name };
                                                        setEditingIdea(updated);
                                                        setIsDetailFolderOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors hover:bg-primary/10 flex items-center gap-2",
                                                        currentIdea.folder === f.name ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <span className="text-base">{f.emoji}</span> {f.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
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
                                else if (inboxState === "folder_detail") setInboxState("initial");
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
                    <div
                        ref={containerRef}
                        className="flex-1 bg-card/40 backdrop-blur-[40px] border border-white/5 rounded-[48px] p-8 md:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col items-center custom-scrollbar overflow-y-auto"
                    >
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

            {renderSuccessPopup()}

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
