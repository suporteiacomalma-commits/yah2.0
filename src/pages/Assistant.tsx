import { useState, useRef } from "react";
import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mic, Image as ImageIcon, Sparkles, Loader2, Brain, X, Keyboard, Search, Send } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const LIFE_BLOCKS = [
    { name: "Vida", color: "bg-pink-500" },
    { name: "Família", color: "bg-yellow-500" },
    { name: "Trabalho", color: "bg-blue-500" },
    { name: "Conteúdo", color: "bg-purple-500" },
    { name: "Saúde", color: "bg-green-500" },
    { name: "Casa", color: "bg-orange-500" },
    { name: "Contas", color: "bg-red-500" },
    { name: "Estudos", color: "bg-indigo-500" },
    { name: "Outro", color: "bg-gray-500" },
];

interface EventoConfirmacao {
    titulo: string;
    categoria: string;
    tipo: "Tarefa" | "Compromisso";
    data: string;
    hora: string | null;
    recorrencia: string;
}

export default function Assistant() {
    const { getSetting } = useSystemSettings();
    const { user } = useAuth();
    const navigate = useNavigate();

    // UI States
    const [inputText, setInputText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showTextInput, setShowTextInput] = useState(false);

    // Confirmation Modal
    const [showModal, setShowModal] = useState(false);
    const [confirmData, setConfirmData] = useState<EventoConfirmacao>({
        titulo: "",
        categoria: "Outro",
        tipo: "Tarefa",
        data: format(new Date(), "yyyy-MM-dd"),
        hora: "09:00",
        recorrencia: "Nenhuma"
    });

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // --- AUDIO HANDLING ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await transcribeAudio(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsListening(true);
            toast.info("Ouvindo...");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao acessar microfone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state !== "inactive") {
            mediaRecorderRef.current?.stop();
        }
        setIsListening(false);
    };

    const transcribeAudio = async (blob: Blob) => {
        setIsProcessing(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("API Key não configurada");

            const formData = new FormData();
            formData.append("file", blob, "audio.webm");
            formData.append("model", "whisper-1");
            formData.append("language", "pt");

            const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                body: formData
            });

            if (!res.ok) throw new Error("Erro na transcrição");
            const data = await res.json();
            const text = data.text;
            setInputText(text);
        } catch (error) {
            toast.error("Houve um erro ao entender o áudio.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("API Key não configurada");

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Image = reader.result as string;

                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: "Extraia o texto desta imagem para organizar tarefas." },
                                    { type: "image_url", image_url: { url: base64Image } }
                                ]
                            }
                        ]
                    })
                });

                if (!res.ok) throw new Error("Erro na visão");
                const data = await res.json();
                setInputText(data.choices[0].message.content);
            };
        } catch (error) {
            toast.error("Erro ao processar imagem.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOrganize = async () => {
        if (!inputText.trim()) return;

        setIsProcessing(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("API Key não configurada");

            const prompt = `Organizador de rotinas. Devolva JSON: { "titulo": "", "categoria": "Vida|Família|Trabalho|Conteúdo|Saúde|Casa|Contas|Estudos|Outro", "tipo": "Tarefa|Compromisso", "data": "YYYY-MM-DD", "hora": "HH:MM", "recorrencia": "Nenhuma|Diária|Semanal|Mensal|Anual" }. Frase: "${inputText}"`;

            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });

            const data = await res.json();
            const json = JSON.parse(data.choices[0].message.content);

            setConfirmData({
                titulo: json.titulo || inputText,
                categoria: json.categoria || "Outro",
                tipo: json.tipo || "Tarefa",
                data: json.data || format(new Date(), "yyyy-MM-dd"),
                hora: json.hora || null,
                recorrencia: json.recorrencia || "Nenhuma"
            });
            setShowModal(true);
        } catch (error) {
            toast.error("Erro na IA.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsProcessing(true);
        try {
            await (supabase.from("EventosDoCerebro") as any).insert({
                titulo: confirmData.titulo,
                categoria: confirmData.categoria,
                tipo: confirmData.tipo,
                data: confirmData.data,
                hora: confirmData.hora,
                recorrencia: confirmData.recorrencia,
                user_id: user.id
            });

            await supabase.from("calendar_activities").insert({
                title: confirmData.titulo,
                date: confirmData.hora ? `${confirmData.data}T${confirmData.hora}:00` : `${confirmData.data}T09:00:00`,
                category: confirmData.tipo === "Compromisso" ? "meeting" : "task",
                user_id: user.id,
                status: "pending"
            });

            toast.success("Salvo com sucesso!");
            setShowModal(false);
            setInputText("");
            setShowTextInput(false);
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <MinimalLayout>
            <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center pt-10 px-4 font-sans selection:bg-primary/30 relative overflow-hidden">

                {/* Visual Background Glow (Subtle) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08)_0%,transparent_70%)] pointer-events-none" />

                <div className="w-full max-w-2xl flex flex-col items-center z-10 animate-in fade-in duration-1000">

                    {/* Compact Microphone */}
                    <div className="relative group/mic mb-8">
                        {/* Rotating Glow Ring */}
                        {!isListening && !isProcessing && (
                            <div className="absolute inset-[-6px] bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 rounded-full blur-lg animate-spin-slow opacity-0 group-hover/mic:opacity-100 transition-opacity duration-700" />
                        )}

                        {isListening && (
                            <>
                                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse" />
                                <div className="absolute inset-[-15px] bg-pink-500/10 rounded-full animate-ping" />
                            </>
                        )}
                        <button
                            onClick={isListening ? stopRecording : startRecording}
                            disabled={isProcessing}
                            className={cn(
                                "relative w-32 h-32 rounded-full p-[2.5px] transition-all duration-700 active:scale-90 shadow-[0_0_40px_rgba(168,85,247,0.15)] hover:shadow-[0_0_60px_rgba(168,85,247,0.3)]",
                                isListening
                                    ? "bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.3)]"
                                    : "bg-gradient-to-br from-[#A855F7] via-[#D946EF] to-[#EC4899] hover:animate-pulse"
                            )}
                        >
                            <div className="w-full h-full rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md transition-colors group-hover/mic:bg-black/10">
                                {isProcessing ? (
                                    <Loader2 className="w-12 h-12 animate-spin text-white opacity-80" />
                                ) : (
                                    <Mic className={cn(
                                        "w-20 h-20 text-white transition-all duration-700 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",
                                        isListening ? "animate-bounce" : "group-hover/mic:scale-105 group-hover/mic:rotate-2 animate-float"
                                    )} />
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Compact Headline */}
                    <div className="text-center space-y-3 mb-12 max-w-lg">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white animate-in slide-in-from-bottom-4 duration-700 leading-tight">
                            Diga tudo que precisa lembrar, <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">que eu organizo para você.</span>
                        </h1>
                        <p className="text-white/20 font-medium text-lg tracking-tight max-w-xs mx-auto">
                            Pressione acima ou capture abaixo.
                        </p>
                    </div>

                    {/* Prominent Search-style Pill Input Bar */}
                    <div className="w-full max-w-xl relative group h-20 mb-16 transition-all duration-500">
                        {/* More distinct outer glow when focused */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />

                        <div className="relative h-full flex items-center bg-[#0F0F0F] border-2 border-white/[0.08] hover:border-white/[0.15] group-focus-within:border-purple-500/50 rounded-full px-8 shadow-[0_32px_64px_rgba(0,0,0,0.6)] group-focus-within:bg-[#121212] transition-all duration-300">
                            <Search className="w-7 h-7 text-white/10 group-focus-within:text-purple-500 transition-colors" />
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Ou digite sua ideia de produto, post..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-xl px-6 placeholder:text-white/5 text-white/90 font-semibold"
                                onKeyDown={(e) => e.key === 'Enter' && handleOrganize()}
                            />

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/20 hover:text-white transition-all shadow-inner"
                                    title="Capturar foto"
                                >
                                    <ImageIcon className="w-6 h-6" />
                                </button>

                                {inputText.length > 0 ? (
                                    <button
                                        onClick={handleOrganize}
                                        disabled={isProcessing}
                                        className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-[#A855F7] to-[#EC4899] flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl shadow-purple-500/40"
                                    >
                                        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 text-white" />}
                                    </button>
                                ) : (
                                    <div className="w-12 h-12 rounded-[18px] bg-white/5 flex items-center justify-center border border-white/[0.03]">
                                        <Keyboard className="w-6 h-6 text-white/5 opacity-40" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>

                    {/* Compact Category Badges */}
                    <div className="w-full flex flex-wrap justify-center gap-3 opacity-40 hover:opacity-80 transition-opacity duration-700">
                        {LIFE_BLOCKS.map(b => (
                            <div key={b.name} className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.03] transition-all hover:bg-white/[0.06] hover:-translate-y-0.5 cursor-default group">
                                <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentcolor] group-hover:scale-110 transition-transform", b.color.replace('bg-', 'text-'))} />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-white/50 transition-colors">{b.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MODAL CONFIRMACAO (Consistent glass styling) */}
                <Dialog open={showModal} onOpenChange={setShowModal}>
                    <DialogContent className="sm:max-w-md bg-[#0D0D0D]/95 backdrop-blur-[40px] border border-white/10 p-10 rounded-[48px] shadow-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none" />
                        <DialogHeader className="relative z-10">
                            <DialogTitle className="flex items-center gap-4 text-3xl font-black italic uppercase tracking-tighter">
                                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                    <Sparkles className="w-5 h-5 text-purple-500" />
                                </div>
                                Confirmar Evento
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-8 pt-6 relative z-10">
                            <div className="space-y-3">
                                <Label className="text-[11px] uppercase font-black tracking-[0.4em] text-white/20 ml-1">Título do Insight</Label>
                                <Input
                                    value={confirmData.titulo}
                                    onChange={e => setConfirmData(p => ({ ...p, titulo: e.target.value }))}
                                    className="bg-white/5 border-white/5 h-15 text-lg font-bold rounded-2xl focus:border-purple-500/50 transition-all px-8 shadow-inner"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-[11px] uppercase font-black tracking-[0.4em] text-white/20 ml-1">Bloco de Vida</Label>
                                    <Select value={confirmData.categoria} onValueChange={v => setConfirmData(p => ({ ...p, categoria: v }))}>
                                        <SelectTrigger className="bg-white/5 border-white/5 h-12 rounded-2xl focus:ring-0 px-6 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-black/95 backdrop-blur-3xl border-white/10 text-white rounded-2xl">
                                            {LIFE_BLOCKS.map(l => (
                                                <SelectItem key={l.name} value={l.name} className="focus:bg-white/10 py-3">{l.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[11px] uppercase font-black tracking-[0.4em] text-white/20 ml-1">Tipo</Label>
                                    <Select value={confirmData.tipo} onValueChange={(v: any) => setConfirmData(p => ({ ...p, tipo: v }))}>
                                        <SelectTrigger className="bg-white/5 border-white/5 h-12 rounded-2xl focus:ring-0 px-6 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-black/95 backdrop-blur-3xl border-white/10 text-white rounded-2xl">
                                            <SelectItem value="Tarefa" className="focus:bg-white/10 py-3">Tarefa</SelectItem>
                                            <SelectItem value="Compromisso" className="focus:bg-white/10 py-3">Compromisso</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-10 relative z-10">
                            <Button
                                onClick={handleSave}
                                disabled={isProcessing}
                                className="w-full h-18 rounded-[24px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xl shadow-2xl shadow-purple-500/30 transition-all hover:scale-[1.03] active:scale-95"
                            >
                                {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : "Confirmar e Agendar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MinimalLayout>
    );
}
