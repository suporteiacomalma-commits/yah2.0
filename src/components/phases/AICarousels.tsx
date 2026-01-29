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

// --- Types ---
interface CarouselSlide {
    text: string;
    secondaryText: string;
    useOnlyMain: boolean;
    // Style
    font: string;
    fontSize: "sm" | "md" | "lg";
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
    secondaryFontSize: "xs" | "sm" | "md" | "lg";
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

            let systemPrompt = `Você é a IA de Carrosséis do app IA com Alma.
            Sua função é gerar carrosséis de 10 slides com profundidade, estética e clareza cognitiva.
            O usuário escolhe entre dois modos:
            1) MODO EDITORIAL: Carrossel emocional, profundo, com espelho → virada → tese → síntese.
            Estrutura dos 10 slides: 1. Abertura editorial, 2. Espelho 1, 3. Espelho 2, 4. Virada 1, 5. Virada 2, 6. Confissão/experiência, 7. Solução conceitual, 8. Expansão da solução, 9. Explicação neuro/técnica, 10. Síntese provocativa.

            2) MODO CULTURAL: Carrossel crítico, cultural, zeitgeist, comportamental, com tom sofisticado.
            Estrutura: 1. Headline cultural, 2. Contexto social, 3. Sinal cultural, 4. Diagnóstico do movimento, 5. Impacto nas pessoas, 6. Consequência cognitiva/emocional, 7. Virada de consciência, 8. Nova interpretação, 9. Crítica ou insight final, 10. Fechamento estético/reflexivo.
            
            REGRAS GERAIS:
            - Use o contexto da marca: ${brandContext}
            - Entregue APENAS um JSON com 10 slides.
            - Cada slide deve ter: text (texto principal, curto e impactante) e secondaryText (contexto ou detalhamento).
            - Não faça perguntas. Não inicie conversa. Não traga imagens.
            - Escreva com estilo premium, profundo e frases curtas.`;

            let userContent = `Gere o carrossel estratégico de 10 slides para este tema: 
                Modo: ${carousel.mode}
                Tema: ${carousel.topic}
                Objetivo: ${carousel.objective}
                Emoção: ${carousel.emotion}. 
                Saída estritamente em JSON: { "slides": [{ "text": "...", "secondaryText": "..." }] }`;

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

            const initialSlides: CarouselSlide[] = result.slides.map((s: any) => ({
                text: s.text,
                secondaryText: s.secondaryText || "",
                useOnlyMain: !s.secondaryText,
                font: "'Playfair Display', serif",
                fontSize: "md",
                alignment: "center",
                isBold: true,
                isItalic: false,
                textColor: "#ffffff",
                secondaryTextColor: "#cccccc",
                lineHeight: "1.2",
                textPosition: "center",
                secondaryPosition: "bottom",
                boxBgColor: "#000000",
                boxOpacity: 0,
                boxPadding: 40,
                overlayColor: "#000000",
                overlayOpacity: 0.5,
                overlayShadow: 1,
                bgZoom: 100,
                bgImage: brand?.graphic_elements || "",
                bgColor: brand?.primary_color || "#000000",
                secondaryFont: "'Inter', sans-serif",
                secondaryFontSize: "sm",
                secondaryLineHeight: "1.5",
                secondaryIsBold: false,
                secondaryIsItalic: false,
                secondaryUppercase: false,
                ...s
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

    const handleExport = async () => {
        if (!carousel.slides?.length) return;
        setIsExporting(true);
        const toastId = toast.loading("Preparando download das imagens...");

        try {
            for (let i = 0; i < carousel.slides.length; i++) {
                const el = slideRefs.current[i];
                if (el) {
                    // Update toast for progress
                    toast.loading(`Baixando imagem ${i + 1} de ${carousel.slides.length}...`, { id: toastId });

                    const dataUrl = await toPng(el, {
                        width: 1080,
                        height: 1350,
                        pixelRatio: 1
                    });

                    // Create direct download
                    const link = document.createElement("a");
                    link.href = dataUrl;
                    link.download = `slide_${String(i + 1).padStart(2, '0')}_${carousel.topic?.slice(0, 10) || 'yah'}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Small delay to ensure browser handles multiple downloads
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            toast.success("Download concluído! Verifique sua pasta de downloads.", { id: toastId });
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
            <header className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white">
                        Templates – <span className="text-primary not-italic font-bold">Carrossel IA</span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        Gere um carrossel completo em 1 clique e personalize do seu jeito.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* History button removed */}

                    <Dialog open={showGenModal} onOpenChange={setShowGenModal}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary text-white h-12 px-4 sm:px-8 rounded-2xl font-bold gap-2 sm:gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto text-sm sm:text-base">
                                <Sparkles className="w-5 h-5" />
                                Gerar carrossel com IA
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-950 border-white/10 text-white max-w-lg rounded-[32px]">
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
                </div>
            </header>

            {/* Editor Container - Responsive Layout 
                Mobile: Standard scroll flow
                Desktop: Fixed height split-pane 
            */}
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
                                    <div className="h-[80%] w-auto aspect-[4/5] lg:w-full lg:max-w-[360px] lg:h-auto rounded-[24px] lg:rounded-[32px] overflow-hidden shadow-2xl border border-white/5 relative bg-slate-900 ring-1 ring-white/10 mx-auto">
                                        <div
                                            className={cn("w-full h-full flex flex-col px-2 py-8 transition-all duration-500 overflow-hidden")}
                                            style={{
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
                                                    className="w-full mx-auto transition-all duration-300 box-border px-2"
                                                    style={{
                                                        backgroundColor: hexToRgba(carousel.slides[currentSlide].boxBgColor || "#000000", carousel.slides[currentSlide].boxOpacity ?? 0.8),
                                                        padding: `${(carousel.slides[currentSlide].boxPadding || 40) / 3}px`,
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: carousel.slides[currentSlide].textPosition === 'left' ? 'flex-start' :
                                                            carousel.slides[currentSlide].textPosition === 'right' ? 'flex-end' : 'center'
                                                    }}
                                                >
                                                    <h1 className={cn(
                                                        "font-black tracking-tighter break-normal w-full box-border hyphens-none",
                                                        carousel.slides[currentSlide].fontSize === 'sm' ? 'text-2xl' :
                                                            carousel.slides[currentSlide].fontSize === 'md' ? 'text-3xl' : 'text-4xl',
                                                        carousel.slides[currentSlide].isItalic && "italic"
                                                    )}
                                                        style={{
                                                            color: carousel.slides[currentSlide].textColor,
                                                            fontFamily: carousel.slides[currentSlide].font,
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
                                                            carousel.slides[currentSlide].secondaryFontSize === 'xs' ? 'text-[10px]' :
                                                                carousel.slides[currentSlide].secondaryFontSize === 'sm' ? 'text-xs' :
                                                                    carousel.slides[currentSlide].secondaryFontSize === 'md' ? 'text-sm' : 'text-base',
                                                            carousel.slides[currentSlide].secondaryIsBold ? "font-bold" : "font-medium",
                                                            carousel.slides[currentSlide].secondaryIsItalic && "italic",
                                                            carousel.slides[currentSlide].secondaryUppercase && "uppercase tracking-wider"
                                                        )}
                                                            style={{
                                                                color: carousel.slides[currentSlide].secondaryTextColor,
                                                                fontFamily: carousel.slides[currentSlide].secondaryFont,
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
                                    <span className="text-[10px] text-muted-foreground/50 font-bold tracking-widest uppercase">Visualização 4:5</span>

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
                                                <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                                                    {["sm", "md", "lg"].map(sz => (
                                                        <button
                                                            key={sz}
                                                            onClick={() => updateSlide(currentSlide, { fontSize: sz as any })}
                                                            className={cn(
                                                                "flex-1 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                                                                carousel.slides![currentSlide].fontSize === sz ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
                                                            )}
                                                        >
                                                            {sz}
                                                        </button>
                                                    ))}
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
                                                        <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                                                            {["xs", "sm", "md", "lg"].map(sz => (
                                                                <button
                                                                    key={sz}
                                                                    onClick={() => updateSlide(currentSlide, { secondaryFontSize: sz as any })}
                                                                    className={cn(
                                                                        "flex-1 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                                                                        carousel.slides![currentSlide].secondaryFontSize === sz ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
                                                                    )}
                                                                >
                                                                    {sz}
                                                                </button>
                                                            ))}
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
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 w-full max-w-6xl mx-auto px-8 flex flex-col items-center justify-center h-full">
                            {/* Empty State / Welcome */}
                            <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-1000">
                                <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center mb-6 ring-4 ring-primary/10 rotate-3">
                                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                                </div>
                                <h2 className="text-2xl font-black text-white italic">Motor de Carrosséis <span className="text-primary not-italic">Yah 2.0</span></h2>
                                <p className="text-muted-foreground text-sm max-w-sm mt-3 font-medium">
                                    Dê vida às suas teses e diagnósticos. Gere uma narrativa completa e estratégica pronta para publicar.
                                </p>
                                <button
                                    onClick={() => setShowGenModal(true)}
                                    className="mt-8 h-14 px-10 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                                >
                                    Criar novo carrossel
                                </button>
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
                                                        fontSize: "md",
                                                        textColor: "#ffffff",
                                                        boxBgColor: "#000000",
                                                        boxPadding: 40,
                                                        textPosition: "center",
                                                        overlayColor: "#000000",
                                                        overlayOpacity: 0.5,
                                                        lineHeight: "1.2",
                                                        useOnlyMain: false,
                                                        secondaryFont: "'Inter', sans-serif",
                                                        secondaryFontSize: "sm",
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
                                    className={cn("export-node", slide.font)}
                                >
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            backgroundColor: slide.overlayColor,
                                            opacity: slide.overlayOpacity
                                        }}
                                    />
                                    <div className={cn(
                                        "relative z-10 w-full h-full flex flex-col px-10 py-20 overflow-hidden",
                                        slide.textPosition === 'center' ? "justify-center items-center text-center" :
                                            slide.textPosition === 'top' ? "justify-start text-center" :
                                                slide.textPosition === 'bottom' ? "justify-end text-center" :
                                                    slide.textPosition === 'left' ? "justify-center items-start text-left" :
                                                        "justify-center items-end text-right"
                                    )}>
                                        <div
                                            style={{
                                                backgroundColor: hexToRgba(slide.boxBgColor || "#000000", slide.boxOpacity ?? 0.8),
                                                padding: `${slide.boxPadding}px`,
                                                borderRadius: '24px'
                                            }}
                                            className="max-w-[90%]"
                                        >
                                            <h1 className={cn(
                                                "font-black tracking-tight leading-tight break-normal w-full hyphens-none",
                                                slide.fontSize === 'sm' ? 'text-6xl' :
                                                    slide.fontSize === 'md' ? 'text-8xl' : 'text-[120px]',
                                                slide.isItalic && "italic"
                                            )}
                                                style={{ color: slide.textColor, lineHeight: slide.lineHeight }}
                                            >
                                                {slide.text}
                                            </h1>
                                            {!slide.useOnlyMain && (
                                                <p className={cn(
                                                    "mt-10 opacity-80 transition-all break-normal w-full hyphens-none",
                                                    slide.secondaryFont,
                                                    slide.secondaryFontSize === 'xs' ? 'text-2xl' :
                                                        slide.secondaryFontSize === 'sm' ? 'text-4xl' :
                                                            slide.secondaryFontSize === 'md' ? 'text-5xl' : 'text-6xl',
                                                    slide.secondaryIsBold ? "font-bold" : "font-medium",
                                                    slide.secondaryIsItalic && "italic",
                                                    slide.secondaryUppercase && "uppercase tracking-wider"
                                                )}
                                                    style={{
                                                        color: slide.secondaryTextColor,
                                                        lineHeight: slide.secondaryLineHeight
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
                                        variant="outline" className="flex-1 md:flex-none h-12 md:h-14 px-4 md:px-6 border-white/10 bg-white/5 text-white rounded-2xl font-bold gap-2 hover:bg-white/10 text-xs md:text-sm"
                                        onClick={handleApplyStyleToAll}
                                    >
                                        <Copy className="w-4 h-4" />
                                        <span className="md:inline uppercase tracking-widest text-[10px] md:text-xs">Aplicar Tudo</span>
                                    </Button>
                                    <Button
                                        variant="outline" className="flex-1 md:flex-none h-12 md:h-14 px-4 md:px-6 border-white/10 bg-white/5 text-white rounded-2xl font-bold gap-2 hover:bg-white/10 text-xs md:text-sm"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span className="md:inline uppercase tracking-widest text-[10px] md:text-xs">Salvar</span>
                                    </Button>
                                </div>

                                <Button
                                    className="gradient-primary w-full md:w-auto h-14 md:h-16 px-6 md:px-10 rounded-[24px] text-white font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 md:gap-4 hover:scale-105 active:scale-95 transition-all"
                                    onClick={handleExport}
                                    disabled={isExporting}
                                >
                                    {isExporting ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <Download className="w-5 h-5 md:w-6 md:h-6" />}
                                    Exportar Carrossel
                                </Button>
                            </div>
                        </footer>
                    )
                }
            </div >
        </div >
    );
}
