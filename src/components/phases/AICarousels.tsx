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
    Italic
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

const FONTS = [
    { name: "Inter (Sans)", value: "font-sans" },
    { name: "Playfair Display (Serif)", value: "font-serif" },
    { name: "Outfit (Modern)", value: "font-outfit" },
    { name: "Montserrat (Clean)", value: "font-montserrat" }
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

    // Refs for export
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

    const handleGenerateWithAI = async () => {
        if (!carousel.topic) {
            toast.error("Por favor, informe o tema do carrossel.");
            return;
        }

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

            const systemPrompt = `Você é a IA de Carrosséis do app IA com Alma.
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

            const userParams = `
                Modo: ${carousel.mode}
                Tema: ${carousel.topic}
                Objetivo: ${carousel.objective}
                Emoção: ${carousel.emotion}
            `;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Gere o carrossel estratégico de 10 slides para este tema: ${userParams}. Saída estritamente em JSON: { "slides": [{ "text": "...", "secondaryText": "..." }] }` }
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
                font: "font-sans",
                fontSize: "md",
                alignment: "center",
                isBold: true,
                isItalic: false,
                textColor: "#FFFFFF",
                secondaryTextColor: "#A1A1AA",
                lineHeight: "1.2",
                textPosition: "center",
                secondaryPosition: "bottom",
                boxBgColor: "transparent",
                boxOpacity: 0,
                boxPadding: 20,
                bgColor: "#09090B",
                overlayColor: "#000000",
                overlayOpacity: 0.2,
                overlayShadow: 1,
                bgZoom: 100,
                secondaryFont: "font-sans",
                secondaryFontSize: "sm",
                secondaryIsBold: false,
                secondaryIsItalic: false,
                secondaryLineHeight: "1.4",
                secondaryUppercase: false
            }));

            setCarousel(prev => ({ ...prev, slides: initialSlides }));
            setShowGenModal(false);
            setCurrentSlide(0);
            toast.success("Carrossel gerado! Agora personalize os slides.");
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao gerar: " + error.message);
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
            const newSlides = (prev.slides || []).map((s, idx) => {
                if (idx === currentSlide) return s;
                return {
                    ...s,
                    font: sourceSlide.font,
                    fontSize: sourceSlide.fontSize,
                    alignment: sourceSlide.alignment,
                    isBold: sourceSlide.isBold,
                    isItalic: sourceSlide.isItalic,
                    textColor: sourceSlide.textColor,
                    secondaryTextColor: sourceSlide.secondaryTextColor,
                    lineHeight: sourceSlide.lineHeight,
                    textPosition: sourceSlide.textPosition,
                    secondaryPosition: sourceSlide.secondaryPosition,
                    boxBgColor: sourceSlide.boxBgColor,
                    boxOpacity: sourceSlide.boxOpacity,
                    boxPadding: sourceSlide.boxPadding,
                    bgColor: sourceSlide.bgColor,
                    overlayColor: sourceSlide.overlayColor,
                    overlayOpacity: sourceSlide.overlayOpacity,
                    overlayShadow: sourceSlide.overlayShadow,
                    secondaryFont: sourceSlide.secondaryFont,
                    secondaryFontSize: sourceSlide.secondaryFontSize,
                    secondaryIsBold: sourceSlide.secondaryIsBold,
                    secondaryIsItalic: sourceSlide.secondaryIsItalic
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
        const toastId = toast.loading("Gerando artes (1080x1350)...");

        try {
            const zip = new JSZip();

            for (let i = 0; i < carousel.slides.length; i++) {
                const el = slideRefs.current[i];
                if (el) {
                    // Force the element to the correct size for export
                    const dataUrl = await toPng(el, {
                        width: 1080,
                        height: 1350,
                        pixelRatio: 1
                    });
                    const base64Data = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
                    zip.file(`slide_${String(i + 1).padStart(2, '0')}.png`, base64Data, { base64: true });
                }
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `carrossel-${carousel.topic || "ia"}.zip`;
            link.click();
            toast.success("Expotação concluída!", { id: toastId });
        } catch (error: any) {
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

                <div className="flex items-center gap-4">
                    {carousel.slides && carousel.slides.length > 0 && (
                        <Button
                            variant="ghost"
                            className="text-white/60 hover:text-white gap-2"
                            onClick={() => setCarousel({ mode: "editorial", topic: "", objective: "atração", emotion: "identificação", slides: [] })}
                        >
                            <HistoryIcon className="w-4 h-4" />
                            Ver Histórico
                        </Button>
                    )}

                    <Dialog open={showGenModal} onOpenChange={setShowGenModal}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary text-white h-12 px-8 rounded-2xl font-bold gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
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

            {/* Editor Area */}
            {carousel.slides && carousel.slides.length > 0 ? (
                <div className="flex-1 flex flex-col items-center">
                    {/* Slide Selector */}
                    <div className="flex items-center gap-6 mb-8">
                        <Button
                            variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10 text-white"
                            onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground">Slide</span>
                            <div className="flex items-center gap-3">
                                {carousel.slides.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentSlide(i)}
                                        className={cn(
                                            "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                            currentSlide === i ? "bg-primary w-8 shadow-[0_0_12px_rgba(139,92,246,0.5)]" : "bg-white/20 hover:bg-white/40"
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

                    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 px-8">
                        {/* Preview (Center) */}
                        <div className="lg:col-span-6 flex flex-col items-center space-y-4">
                            <div className="relative group perspective-1000">
                                {/* SCALE PREVIEW FOR UI */}
                                <div className="w-[360px] h-[450px] rounded-[32px] overflow-hidden shadow-2xl border border-white/5 relative bg-slate-900 ring-1 ring-white/10">
                                    <div
                                        className={cn("w-full h-full flex flex-col p-8 transition-all duration-500", carousel.slides[currentSlide].font)}
                                        style={{
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
                                                style={{
                                                    backgroundColor: carousel.slides[currentSlide].boxBgColor,
                                                    padding: `${carousel.slides[currentSlide].boxPadding / 3}px`,
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                <h1 className={cn(
                                                    "font-black tracking-tighter leading-[1.1]",
                                                    carousel.slides[currentSlide].fontSize === 'sm' ? 'text-2xl' :
                                                        carousel.slides[currentSlide].fontSize === 'md' ? 'text-3xl' : 'text-4xl',
                                                    carousel.slides[currentSlide].isItalic && "italic"
                                                )}
                                                    style={{ color: carousel.slides[currentSlide].textColor }}
                                                >
                                                    {carousel.slides[currentSlide].text}
                                                </h1>
                                                {!carousel.slides[currentSlide].useOnlyMain && (
                                                    <p className={cn(
                                                        "mt-3 opacity-80 leading-relaxed transition-all",
                                                        carousel.slides[currentSlide].secondaryFont,
                                                        carousel.slides[currentSlide].secondaryFontSize === 'xs' ? 'text-[10px]' :
                                                            carousel.slides[currentSlide].secondaryFontSize === 'sm' ? 'text-xs' :
                                                                carousel.slides[currentSlide].secondaryFontSize === 'md' ? 'text-sm' : 'text-base',
                                                        carousel.slides[currentSlide].secondaryIsBold ? "font-bold" : "font-medium",
                                                        carousel.slides[currentSlide].secondaryIsItalic && "italic",
                                                        carousel.slides[currentSlide].secondaryUppercase && "uppercase tracking-wider"
                                                    )}
                                                        style={{
                                                            color: carousel.slides[currentSlide].secondaryTextColor,
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
                            </div>
                            <span className="text-[10px] text-muted-foreground/50 font-bold tracking-widest uppercase">Visualização 4:5</span>
                        </div>

                        {/* Controls (Right) */}
                        <div className="lg:col-span-6 space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                            {/* Block 1: TEXT */}
                            <div className="bg-slate-900/40 border border-white/5 rounded-[24px] p-6 space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Type className="w-4 h-4" /></div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Texto & Tipografia</h3>
                                </div>

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
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                {FONTS.map(f => (
                                                    <SelectItem key={f.value} value={f.value}>{f.name}</SelectItem>
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
                                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                        {FONTS.map(f => (
                                                            <SelectItem key={f.value} value={f.value}>{f.name}</SelectItem>
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
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-muted-foreground ml-1">Entrelinha</Label>
                                                <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                                                    {["1.0", "1.2", "1.4", "1.6"].map(lh => (
                                                        <button
                                                            key={lh}
                                                            onClick={() => updateSlide(currentSlide, { secondaryLineHeight: lh })}
                                                            className={cn(
                                                                "flex-1 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                                                                carousel.slides![currentSlide].secondaryLineHeight === lh ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
                                                            )}
                                                        >
                                                            {lh}
                                                        </button>
                                                    ))}
                                                </div>
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
                <div className="flex-1 w-full max-w-6xl px-8 flex flex-col pt-8">
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
                                            setCarousel(item);
                                            setCurrentSlide(0);
                                        }}
                                    >
                                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
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
                                    "relative z-10 w-full h-full flex flex-col p-20",
                                    slide.textPosition === 'center' ? "justify-center items-center text-center" :
                                        slide.textPosition === 'top' ? "justify-start text-center" :
                                            slide.textPosition === 'bottom' ? "justify-end text-center" :
                                                slide.textPosition === 'left' ? "justify-center items-start text-left" :
                                                    "justify-center items-end text-right"
                                )}>
                                    <div
                                        style={{
                                            backgroundColor: slide.boxBgColor,
                                            padding: `${slide.boxPadding}px`,
                                            borderRadius: '24px'
                                        }}
                                        className="max-w-[90%]"
                                    >
                                        <h1 className={cn(
                                            "font-black tracking-tight leading-tight",
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
                                                "mt-10 opacity-80 transition-all",
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
                    <footer className="fixed bottom-0 left-0 right-0 h-28 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 px-8 flex items-center justify-center z-50">
                        <div className="max-w-6xl w-full flex items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline" className="h-14 px-6 border-white/10 bg-white/5 text-white rounded-2xl font-bold gap-2 hover:bg-white/10"
                                    onClick={handleApplyStyleToAll}
                                >
                                    <Copy className="w-4 h-4" />
                                    <span className="hidden md:inline text-xs uppercase tracking-widest">Aplicar estilo em todos</span>
                                </Button>
                                <Button
                                    variant="outline" className="h-14 px-6 border-white/10 bg-white/5 text-white rounded-2xl font-bold gap-2 hover:bg-white/10"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span className="hidden md:inline text-xs uppercase tracking-widest">Salvar</span>
                                </Button>
                            </div>

                            <Button
                                className="gradient-primary h-16 px-10 rounded-[24px] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center gap-4 hover:scale-105 active:scale-95 transition-all"
                                onClick={handleExport}
                                disabled={isExporting}
                            >
                                {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                                Exportar Carrossel (10 artes)
                            </Button>
                        </div>
                    </footer>
                )
            }
        </div >
    );
}
