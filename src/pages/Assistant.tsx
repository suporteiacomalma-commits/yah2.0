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

export default function Assistant() {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [proposedTask, setProposedTask] = useState<any>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef("");

    const initRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            toast.error("Seu navegador não suporta reconhecimento de voz. Tente usar o Chrome ou Edge.");
            return null;
        }

        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            toast.warning("O reconhecimento de voz pode não funcionar em conexões não seguras (HTTP).");
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "pt-BR";

        recognition.onstart = () => {
            console.log("Speech recognition started");
            setIsListening(true);
            setTranscript("");
            transcriptRef.current = "";
            setShowConfirmation(false);
            setProposedTask(null);
        };

        recognition.onspeechstart = () => {
            console.log("Speech detected");
        };

        recognition.onspeechend = () => {
            console.log("Speech ended");
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    transcriptRef.current = event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            const currentTranscript = transcriptRef.current || interimTranscript;
            setTranscript(currentTranscript);
            console.log("Transcript updated:", currentTranscript);
        };

        recognition.onend = () => {
            console.log("Speech recognition ended");
            setIsListening(false);
            const finalTranscript = transcriptRef.current.trim();
            if (finalTranscript) {
                prepareTask(finalTranscript);
            } else {
                toast.info("Nenhuma fala detectada. Tente aproximar o microfone ou falar mais alto.");
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);

            switch (event.error) {
                case 'no-speech':
                    toast.info("Não ouvi nada. Tente falar novamente.");
                    break;
                case 'not-allowed':
                    toast.error("Microfone bloqueado! Clique no ícone de cadeado na barra do navegador e permita o uso do microfone.");
                    break;
                case 'network':
                    toast.error("Erro de rede. Verifique sua conexão com a internet.");
                    break;
                case 'aborted':
                    console.log("Recognition aborted");
                    break;
                default:
                    toast.error(`Erro: ${event.error}. Tente recarregar a página.`);
            }
        };

        return recognition;
    };

    useEffect(() => {
        recognitionRef.current = initRecognition();

        // Check for microphone permissions if possible
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'microphone' as any }).then((permissionStatus) => {
                if (permissionStatus.state === 'denied') {
                    toast.error("Acesso ao microfone negado. Por favor, habilite nas configurações do seu navegador.");
                }
                permissionStatus.onchange = () => {
                    if (permissionStatus.state === 'granted') {
                        toast.success("Microfone habilitado!");
                        recognitionRef.current = initRecognition();
                    }
                };
            });
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {
                    console.error("Cleanup error", e);
                }
            }
        };
    }, [user?.id]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            recognitionRef.current = initRecognition();
            if (!recognitionRef.current) return;
        }

        if (isListening) {
            try {
                recognitionRef.current.stop();
            } catch (error) {
                console.error("Stop error", error);
                setIsListening(false);
            }
        } else {
            try {
                // Always try to abort before starting to ensure a clean state
                try {
                    recognitionRef.current.abort();
                } catch (e) { }

                recognitionRef.current.start();
                toast.info("Ouvindo... Pode falar!");
            } catch (error) {
                console.error("Start recognition error", error);
                // Reset ref and try again if starting fails unexpectedly
                recognitionRef.current = initRecognition();
                try {
                    recognitionRef.current?.start();
                } catch (e) {
                    console.error("Retry start error", e);
                    toast.error("Não foi possível iniciar o microfone. Recarregue a página.");
                }
            }
        }
    };

    const prepareTask = async (text: string) => {
        setIsProcessing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 600));

            const now = new Date();
            let activityDate = new Date();
            const lowerText = text.toLowerCase();

            // 1. Detect relative days
            if (lowerText.includes("amanhã")) {
                activityDate.setDate(now.getDate() + 1);
            } else if (lowerText.includes("hoje")) {
                activityDate = new Date(now);
            } else {
                // 2. Detect days of the week
                const daysMap: Record<string, number> = {
                    "domingo": 0,
                    "segunda": 1,
                    "terça": 2,
                    "quarta": 3,
                    "quinta": 4,
                    "sexta": 5,
                    "sábado": 6,
                    "sabado": 6
                };

                for (const [dayName, dayIndex] of Object.entries(daysMap)) {
                    if (lowerText.includes(dayName)) {
                        const currentDay = now.getDay();
                        let diff = dayIndex - currentDay;
                        // If it's the same day or past, go to next week's day
                        if (diff <= 0) diff += 7;
                        activityDate.setDate(now.getDate() + diff);
                        break;
                    }
                }
            }

            // 3. Detect Time (e.g., "as 19h", "às 19:30", "19:00")
            const timeRegex = /(?:as|às|s)?\s*(\d{1,2})(?:[:h](\d{2})?)?/i;
            const timeMatch = lowerText.match(timeRegex);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1], 10);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
                if (hours >= 0 && hours < 24) {
                    activityDate.setHours(hours, minutes, 0, 0);
                }
            } else {
                // Default time
                activityDate.setHours(9, 0, 0, 0);
            }

            setProposedTask({
                user_id: user?.id,
                title: text.charAt(0).toUpperCase() + text.slice(1),
                description: `Criado via assistente de voz: "${text}"`,
                date: activityDate.toISOString(),
                category: "task",
                status: "pending",
                priority: "medium",
            });
            setShowConfirmation(true);
        } catch (error) {
            console.error("Error preparing task:", error);
            toast.error("Falha ao interpretar comando.");
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
                            {isProcessing ? (
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
                            {isListening ? "Ouvindo agora..." : isProcessing ? "Processando comando..." : showConfirmation ? "Comando Interpretado" : "Aguardando Voz..."}
                        </span>

                        <p className={cn(
                            "text-xl md:text-2xl font-medium leading-relaxed italic transition-all duration-300",
                            showConfirmation ? "text-foreground" : "text-foreground/60"
                        )}>
                            {transcript ? `"${transcript}"` : "Diga algo como: 'Marcar reunião para amanhã'"}
                        </p>

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
                                    disabled={isProcessing}
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
