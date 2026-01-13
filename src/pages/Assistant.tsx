import { useState, useRef, useEffect } from "react";
import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { Button } from "@/components/ui/button";
import { Mic, X, Sparkles, Brain, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
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
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

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

            const prompt = `Você é um assistente pessoal inteligente. Sua tarefa é converter uma frase dita pelo usuário em um objeto JSON estruturado para uma atividade de calendário.

Data/Hora atual: ${currentDateTime}

Frase do usuário: "${text}"

Regras:
1. Extraia o título da tarefa da forma mais clara possível.
2. Identifique a data e hora. Resolva termos relativos (ex: amanhã, próxima terça, hoje à noite às 20h) baseando-se na Data/Hora atual fornecida acima.
3. Se o usuário não mencionar horário, defina como 09:00:00 do dia identificado.
4. Categorize rigorosamente entre: "task", "meeting", "content", "deadline" ou "reminder". (Não use "event").
5. Defina a prioridade como "low", "medium" ou "high" baseado na urgência detectada.
6. Identifique se é recorrente. Se o usuário disser "todo dia", "toda segunda", "mensalmente", etc.
   - is_recurring: boolean
   - recurrence_rule: "daily", "weekly", "monthly" ou null

Retorne APENAS um objeto JSON com as seguintes chaves:
{
  "title": "string",
  "description": "string (resumo ou frase original)",
  "date": "string (formato ISO 8601)",
  "category": "string",
  "priority": "string",
  "is_recurring": boolean,
  "recurrence_rule": "string or null",
  "status": "pending"
}`;

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

            if (!response.ok) {
                throw new Error("Falha na comunicação com a IA.");
            }

            const aiData = await response.json();
            const results = JSON.parse(aiData.choices[0].message.content);

            setProposedTask({
                ...results,
                user_id: user?.id,
                status: "pending"
            });
            setShowConfirmation(true);
            await speak(`Entendi. Você quer ${results.title}. Posso salvar?`);
        } catch (error: any) {
            console.error("Error preparing task with AI:", error);
            toast.error("Falha ao interpretar comando com IA. " + (error.message || ""));
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmTask = async () => {
        if (!proposedTask) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from("calendar_activities").insert(proposedTask);
            if (error) throw error;

            await speak("Com certeza! Sua tarefa já foi salva no seu calendário.");
            toast.success("Tarefa enviada e criada com sucesso!");
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
        setShowConfirmation(false);
        setTranscript("");
        toast.info("Tarefa descartada.");
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
                            showConfirmation ? "text-foreground" : "text-foreground/60"
                        )}>
                            {showConfirmation && proposedTask ? proposedTask.title : transcript ? `"${transcript}"` : "Diga algo como: 'Marcar dentista para amanhã às 15h'"}
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
