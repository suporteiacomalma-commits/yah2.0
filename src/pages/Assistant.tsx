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
    const { getSetting } = useSystemSettings();
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
4. Categorize entre: "task", "meeting", "event", ou "reminder".
5. Defina a prioridade como "low", "medium" ou "high" baseado na urgência detectada.

Retorne APENAS um objeto JSON com as seguintes chaves:
{
  "title": "string",
  "description": "string (resumo ou frase original)",
  "date": "string (formato ISO 8601)",
  "category": "string",
  "priority": "string",
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
