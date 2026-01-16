import { useState, useRef, useEffect } from "react";
import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { Button } from "@/components/ui/button";
import { Mic, X, Sparkles, Brain, Loader2, Calendar } from "lucide-react";
import { format, addDays, addWeeks, addMonths, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export default function Assistant() {
    const { getSetting, isLoading: isLoadingSettings } = useSystemSettings();
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [proposedTask, setProposedTask] = useState<any>(null);
    const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const visualRecognitionRef = useRef<any>(null);

    const speak = async (text: string) => {
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) return;

            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "tts-1",
                    voice: "shimmer",
                    input: text,
                })
            });

            if (!response.ok) throw new Error("TTS failed");

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            await audio.play();
        } catch (error) {
            console.error("TTS Error:", error);
        }
    };

    const transcribeAudio = async (blob: Blob) => {
        setIsProcessing(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) {
                toast.error("OpenAI API Key não configurada.");
                return;
            }

            const formData = new FormData();
            formData.append("file", blob, "audio.webm");
            formData.append("model", "whisper-1");
            formData.append("language", "pt");

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) throw new Error("Whisper fail");

            const data = await response.json();
            const text = data.text;
            setTranscript(text);
            await prepareTask(text);
        } catch (error: any) {
            console.error("Transcription error:", error);
            toast.error("Falha ao transcrever áudio.");
        } finally {
            setIsProcessing(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            // Parallel SpeechRecognition for Real-time Visualization
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const visualRec = new SpeechRecognition();
                visualRec.continuous = true;
                visualRec.interimResults = true;
                visualRec.lang = "pt-BR";

                visualRec.onresult = (event: any) => {
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            setTranscript(event.results[i][0].transcript);
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    if (interimTranscript) {
                        setTranscript(interimTranscript);
                    }
                };
                visualRec.start();
                visualRecognitionRef.current = visualRec;
            }

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (blob.size > 0) {
                    transcribeAudio(blob);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsListening(true);
            setTranscript("");
            setShowConfirmation(false);
            setProposedTask(null);
            setAssistantResponse(null);
            toast.info("Ouvindo... Pode falar!");
        } catch (error) {
            console.error("Mic access error:", error);
            toast.error("Erro ao acessar microfone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (visualRecognitionRef.current) {
            visualRecognitionRef.current.stop();
        }
        setIsListening(false);
    };

    const toggleListening = () => {
        if (isListening) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    useEffect(() => {
        const context = sessionStorage.getItem("ai_assistant_context");
        if (context && !isLoadingSettings) {
            setTranscript(context);
            prepareTask(context);
            sessionStorage.removeItem("ai_assistant_context");
        }

        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        };
    }, [isLoadingSettings]);

    const prepareTask = async (text: string) => {
        setIsProcessing(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) {
                toast.error("OpenAI API Key não configurada. Fale com um administrador.");
                setIsProcessing(false);
                return;
            }

            const now = new Date();
            const currentDateTime = format(now, "eeee, dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });

            const prompt = `Você é um assistente pessoal inteligente. Analise a frase do usuário e identifique o "intent" (intenção).

Data/Hora atual: ${currentDateTime}
Frase do usuário: "${text}"

Determine se o usuário quer CRIAR uma tarefa ou CONSULTAR dados existentes.

Se o intent for "create":
Extraia as informações para a tarefa.
{
  "intent": "create",
  "data": {
    "title": "string",
    "description": "string",
    "date": "string (YYYY-MM-DDTHH:mm:ss)",
    "category": "task|meeting|content|deadline|reminder",
    "priority": "low|medium|high",
    "is_recurring": boolean,
    "recurrence_rule": "daily|weekly|monthly|null",
    "recurrence_end": "string|null"
  }
}

Se o intent for "query":
Identifique o que ele quer saber.
{
  "intent": "query",
  "data": {
    "type": "calendar_activities",
    "target_date_start": "string (YYYY-MM-DDTHH:mm:ss)",
    "target_date_end": "string (YYYY-MM-DDTHH:mm:ss)",
    "query_description": "string"
  }
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
                    messages: [
                        { role: "system", content: "Você é um assistente que extrai dados estruturados de comandos de voz. Saída sempre em JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("Falha na comunicação com a IA.");

            const aiData = await response.json();
            const results = JSON.parse(aiData.choices[0].message.content);

            if (results.intent === "query") {
                await handleQuery(results.data);
            } else {
                setProposedTask({
                    ...results.data,
                    user_id: user?.id,
                    status: "pending"
                });
                setShowConfirmation(true);
                await speak(`Entendi. Você quer ${results.data.title}. Posso salvar?`);
            }
        } catch (error: any) {
            console.error("Error preparing task with AI:", error);
            toast.error("Falha ao interpretar comando com IA. " + (error.message || ""));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleQuery = async (queryData: any) => {
        setIsProcessing(true);
        try {
            const { data: activities, error } = await supabase
                .from("calendar_activities")
                .select("*")
                .eq("user_id", user?.id)
                .gte("date", queryData.target_date_start)
                .lte("date", queryData.target_date_end)
                .order("date", { ascending: true });

            if (error) throw error;

            const apiKey = getSetting("openai_api_key")?.value;
            const prompt = `O usuário perguntou: "${transcript}"
            Encontrei as seguintes atividades no banco de dados: ${JSON.stringify(activities)}
            
            Gere uma resposta curta, amigável e natural para ser dita por voz, resumindo essas atividades.
            Se não houver nada, diga de forma gentil.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um assistente pessoal prestativo." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const data = await response.json();
            const finalSpeech = data.choices[0].message.content;

            setAssistantResponse(finalSpeech);
            await speak(finalSpeech);
        } catch (error: any) {
            console.error("Query handling error:", error);
            toast.error("Erro ao buscar informações: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmTask = async () => {
        if (!proposedTask) return;
        setIsProcessing(true);
        try {
            const tasksToInsert = [];

            if (proposedTask.is_recurring && proposedTask.recurrence_rule) {
                let currentDate = parseISO(proposedTask.date);
                // Define um limite de segurança para recorrência (ex: 3 meses se não houver end date)
                const limitDate = proposedTask.recurrence_end
                    ? parseISO(proposedTask.recurrence_end)
                    : addMonths(currentDate, 3);

                while (isBefore(currentDate, limitDate) || format(currentDate, 'yyyy-MM-dd') === format(limitDate, 'yyyy-MM-dd')) {
                    const { recurrence_end, ...taskData } = proposedTask;
                    tasksToInsert.push({
                        ...taskData,
                        date: currentDate.toISOString()
                    });

                    if (proposedTask.recurrence_rule === 'daily') {
                        currentDate = addDays(currentDate, 1);
                    } else if (proposedTask.recurrence_rule === 'weekly') {
                        currentDate = addWeeks(currentDate, 1);
                    } else if (proposedTask.recurrence_rule === 'monthly') {
                        currentDate = addMonths(currentDate, 1);
                    } else {
                        break;
                    }
                }
            } else {
                const { recurrence_end, ...taskData } = proposedTask;
                tasksToInsert.push(taskData);
            }

            const { error } = await supabase.from("calendar_activities").insert(tasksToInsert);
            if (error) throw error;

            await speak("Com certeza! Sua(s) tarefa(s) já foi/foram salva(s) no seu calendário.");
            toast.success(`${tasksToInsert.length} tarefa(s) criada(s) com sucesso!`);
            setTimeout(() => navigate("/dashboard"), 1500);
        } catch (error: any) {
            console.error("Error creating task:", error);
            toast.error("Erro ao criar tarefa: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const cancelTask = () => {
        setProposedTask(null);
        setAssistantResponse(null);
        setShowConfirmation(false);
        setTranscript("");
        toast.info("Comando cancelado.");
    };

    return (
        <MinimalLayout>
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
                {/* Brain Atmosphere Backdrop */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" />
                    <div className="grid-pattern absolute inset-0 opacity-20" />
                </div>

                <button
                    onClick={() => navigate("/dashboard")}
                    className="absolute top-8 right-8 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors z-20"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center space-y-12">
                    {/* Brain Icon/Visual */}
                    <div className="relative">
                        <div className={cn(
                            "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
                            isListening ? "bg-primary glow-primary scale-110" : "bg-card border border-primary/30",
                            isProcessing && "animate-spin-slow"
                        )}>
                            {isProcessing || isLoadingSettings ? (
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            ) : (
                                <Brain className={cn("w-16 h-16 transition-colors", isListening ? "text-white" : "text-primary")} />
                            )}
                        </div>
                        {isListening && (
                            <div className="absolute -inset-4 border-2 border-primary/50 rounded-full animate-ping opacity-50" />
                        )}
                    </div>

                    <div className={cn(
                        "w-full min-h-[140px] p-8 rounded-3xl transition-all duration-500 relative overflow-hidden",
                        showConfirmation
                            ? "bg-primary/10 border-primary/40 border-[3px] shadow-[0_0_40px_rgba(var(--primary),0.1)]"
                            : "bg-card/40 backdrop-blur-xl border border-white/10 shadow-2xl",
                        "flex flex-col items-center justify-center text-center"
                    )}>
                        {showConfirmation && (
                            <div className="absolute top-4 left-4">
                                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                            </div>
                        )}

                        <span className={cn(
                            "text-xs font-bold uppercase tracking-[0.2em] mb-4 transition-colors",
                            showConfirmation ? "text-primary" : "text-muted-foreground"
                        )}>
                            {isListening ? "Ouvindo agora..." : (isProcessing || isLoadingSettings) ? "Processando comando..." : showConfirmation ? "Comando Interpretado" : "Aguardando Voz..."}
                        </span>

                        <p className={cn(
                            "text-xl md:text-2xl font-medium leading-relaxed italic transition-all duration-300",
                            (showConfirmation || assistantResponse) ? "text-foreground" : "text-foreground/60"
                        )}>
                            {assistantResponse ? assistantResponse : showConfirmation && proposedTask ? proposedTask.title : transcript ? `"${transcript}"` : "Diga algo como: 'Marcar dentista para amanhã às 15h'"}
                        </p>

                        {showConfirmation && proposedTask && (
                            <div className="mt-4 flex flex-wrap justify-center gap-2 animate-in slide-in-from-bottom-2">
                                <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                                    {proposedTask.category}
                                </div>
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                    proposedTask.priority === "high" ? "bg-destructive/20 text-destructive" :
                                        proposedTask.priority === "medium" ? "bg-orange-500/20 text-orange-500" :
                                            "bg-green-500/20 text-green-500"
                                )}>
                                    Prio: {proposedTask.priority}
                                </div>
                                {proposedTask.is_recurring && (
                                    <div className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        Recorrente: {proposedTask.recurrence_rule === 'daily' ? 'Diário' :
                                            proposedTask.recurrence_rule === 'weekly' ? 'Semanal' :
                                                proposedTask.recurrence_rule === 'monthly' ? 'Mensal' : 'Sim'}
                                    </div>
                                )}
                            </div>
                        )}

                        {showConfirmation && proposedTask && (
                            <div className="mt-6 flex items-center gap-3 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-semibold animate-in slide-in-from-bottom-2">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(proposedTask.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-6 w-full">
                        {showConfirmation ? (
                            <div className="flex gap-4 w-full animate-in fade-in zoom-in duration-300">
                                <Button
                                    variant="outline"
                                    onClick={cancelTask}
                                    className="flex-1 h-14 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10"
                                    disabled={isProcessing}
                                >
                                    Descartar
                                </Button>
                                <Button
                                    onClick={confirmTask}
                                    className="flex-1 h-14 rounded-xl gradient-primary text-white font-bold text-lg shadow-lg shadow-primary/30"
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" /> : "Sim, enviar"}
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Button
                                    size="lg"
                                    onClick={toggleListening}
                                    className={cn(
                                        "w-20 h-20 rounded-full p-0 shadow-2xl transition-all active:scale-95",
                                        isListening ? "bg-destructive hover:bg-destructive/90" : "gradient-primary"
                                    )}
                                    disabled={isProcessing || isLoadingSettings}
                                >
                                    <Mic className="w-10 h-10 text-white" />
                                </Button>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                                    <Sparkles className="w-3 h-3 text-accent" />
                                    Inteligência Artificial Integrada
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}} />
        </MinimalLayout >
    );
}
