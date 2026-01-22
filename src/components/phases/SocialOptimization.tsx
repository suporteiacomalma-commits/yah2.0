import React, { useState, useEffect, useRef } from "react";
import {
    Camera, Plus, Pencil, Save, Upload, Link,
    Loader2, Sparkles, ChevronRight, ArrowLeft, ChevronLeft,
    Instagram, MessageSquare, Image as ImageIcon,
    MoreHorizontal, Grid, Film, UserSquare,
    TrendingUp, Compass, PlayCircle, History,
    Trash2, Wand2, Brain, Check, ChevronDown, Menu, Sparkle, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/hooks/useBrand";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { supabase } from "@/integrations/supabase/client";
import { useSocialOptimizer, SocialOptimizerData } from "@/hooks/useSocialOptimizer";

type Step = "tela1" | "tela2" | "tela3a" | "tela3b" | "tela3c";

export function SocialOptimization() {
    const { user } = useAuth();
    const { brand } = useBrand();
    const { socialData, updateSocialData, isLoading } = useSocialOptimizer();
    const { getSetting } = useSystemSettings();

    const [step, setStep] = useState<Step>("tela1");
    const [localData, setLocalData] = useState<Partial<SocialOptimizerData>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [postIndex, setPostIndex] = useState(0);
    const profilePhotoInputRef = useRef<HTMLInputElement>(null);
    const isDirty = useRef(false);

    // Initialize local data when socialData loads
    useEffect(() => {
        if (socialData) {
            setLocalData(socialData);
            // Only redirect to mockup (tela2) if we are still on the initial screen
            if (step === "tela1" && (socialData.diagnosis || socialData.print_url || socialData.bio || socialData.name)) {
                setStep("tela2");
            }
        } else {
            // Default values for new profile
            setLocalData({
                stats: { posts: 0, followers: 0, following: 0 },
                highlights: [
                    { title: "Transformação", description: "", cover_url: "", type: "transformation" },
                    { title: "Jornada", description: "", cover_url: "", type: "journey" },
                    { title: "Dúvidas", description: "", cover_url: "", type: "faq" }
                ],
                pinned_posts: [
                    { theme: "", content: "", thumbnail_url: "", logic: "Post 1 — Dor e Promessa: validar a dor real, explicar por que essa dor existe, apresentar promessa específica.", link: "", type: "pain" },
                    { theme: "", content: "", thumbnail_url: "", logic: "Post 2 — Processo/Ferramenta: mostrar como o método funciona e demonstrar o mecanismo antes → depois.", link: "", type: "process" },
                    { theme: "", content: "", thumbnail_url: "", logic: "Post 3 — Transformação + CTA: apresentar resultado concreto, prova e CTA direto.", link: "", type: "transformation" }
                ]
            });
        }
    }, [socialData]);

    const markAsDirty = () => {
        isDirty.current = true;
    };

    // Auto-save logic with debounce

    // Auto-save logic with debounce
    useEffect(() => {
        if (!socialData || !isDirty.current) return;

        const timer = setTimeout(async () => {
            const updates: Partial<SocialOptimizerData> = {};
            let hasChanges = false;

            // Compare localData with socialData
            Object.keys(localData).forEach((key) => {
                const k = key as keyof SocialOptimizerData;
                if (JSON.stringify(localData[k]) !== JSON.stringify(socialData[k])) {
                    (updates as any)[k] = localData[k];
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                await updateSocialData.mutateAsync({ updates, silent: true });
                isDirty.current = false;
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [localData, socialData]);

    const handleUploadPrint = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsProcessing(true);
        try {
            // 1. Upload image to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_${Date.now()}.${fileExt}`;
            const filePath = `prints/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('social_assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('social_assets')
                .getPublicUrl(filePath);

            // 2. Update local state and persistence
            const updates = { print_url: publicUrl, profile_image_url: publicUrl };
            setLocalData(prev => ({ ...prev, ...updates }));
            await updateSocialData.mutateAsync({ updates, silent: true });

            // 3. Trigger Diagnosis via AI
            await handleGenerateDiagnosis(publicUrl);

        } catch (error: any) {
            toast.error("Erro no upload: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsProcessing(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `profile_${user.id}_${Date.now()}.${fileExt}`;
            const filePath = `profiles/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('social_assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('social_assets')
                .getPublicUrl(filePath);

            const updates = { profile_image_url: publicUrl };
            setLocalData(prev => ({ ...prev, ...updates }));
            await updateSocialData.mutateAsync({ updates, silent: true });
            toast.success("Foto de perfil atualizada!");
        } catch (error: any) {
            toast.error("Erro no upload: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerateDiagnosis = async (printUrl?: string) => {
        setIsGenerating(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) throw new Error("Chave da API não configurada");

            const brandContext = brand ? `
        Persona: ${brand.dna_persona_data?.name || 'Não definido'}
        Nicho: ${brand.dna_nicho || 'Não definido'}
        Produto: ${brand.dna_produto || 'Não definido'}
        Diferencial: ${brand.dna_diferencial || 'Não definido'}
        Tese: ${brand.dna_tese || 'Não definida'}
        Tom de Voz: ${brand.result_tom_voz || 'Não definido'}
      ` : '';

            const prompt = `Você é a IA estratégica do Yah2.0. Seu objetivo é realizar um diagnóstico do perfil do Instagram do usuário.
      
      CONTEXTO DA MARCA:
      ${brandContext}

      ${printUrl ? `O usuário enviou um print do perfil localizado em: ${printUrl}. EXTRAIA O NOME, @USER E STATS (posts, seguidores, seguindo) DO PRINT.` : 'O usuário pulou o envio do print.'}
      
      GERE UMA ESTRATÉGIA COMPLETA DE PERFIL (Bio, 3 Destaques, 3 Posts Fixados):
      
      REGRAS PARA A BIO (Siga exatamente este modelo de 4 linhas):
      1. Identidade específica do criador + validação de uma dor real do público.
      2. Nome do mecanismo único ou método próprio do usuário.
      3. Resultado concreto, específico e verificável que o método entrega.
      4. CTA direto e funcional, sem clichê.

      REGRAS CRÍTICAS:
      • Nunca usar frases genéricas, motivacionais ou vazias.
      • Nunca usar “ajudo pessoas”, “transformando vidas”, “sua melhor versão”, “você merece mais”, “vivendo seu propósito”.
      • Máximo 150 caracteres no total.
      • Retorne apenas as 4 linhas, uma por linha.

      REGRAS PARA DESTAQUES (Gere 3):

      REGRAS PARA DESTAQUES (Gere 3):
      - Tipo "transformation": Focado em provas e resultados.
      - Tipo "journey": Focado na história e autoridade da marca.
      - Tipo "faq": Focado em quebra de objeções.

      REGRAS PARA POSTS FIXADOS (Gere 3):
      - Post 1 (DOR): Validar a dor real, explicar por que essa dor existe, apresentar promessa específica.
      - Post 2 (MÉTODO): Mostrar como o mecanismo único funciona.
      - Post 3 (PROVA/CTA): Resultado concreto + CTA direto.

      SAÍDA EM JSON:
      {
        "diagnosis": "Breve análise estratégica baseada no DNA.",
        "name": "Nome da Marca/Persona",
        "handle": "@usuario",
        "bio": "Linha 1\nLinha 2\nLinha 3\nLinha 4",
        "highlights": [
          { "title": "Nome Curto", "description": "Lógica do conteúdo", "type": "transformation" },
          { "title": "Nome Curto", "description": "Lógica do conteúdo", "type": "journey" },
          { "title": "Nome Curto", "description": "Lógica do conteúdo", "type": "faq" }
        ],
        "pinned_posts": [
          { "content": "Roteiro/Lógica detalhada", "type": "pain", "logic": "DOR E PROMESSA" },
          { "content": "Roteiro/Lógica detalhada", "type": "process", "logic": "PROCESSO/MÉTODO" },
          { "content": "Roteiro/Lógica detalhada", "type": "transformation", "logic": "PROVA/CTA" }
        ],
        "stats": { "posts": 10, "followers": 1250, "following": 350 }
      }
      `;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um estrategista de Instagram premium e especialista em extração de dados visual (OCR). Saída apenas JSON." },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                ...(printUrl ? [{ type: "image_url", image_url: { url: printUrl } }] : [])
                            ]
                        }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("Erro na IA");
            const data = await response.json();
            const result = JSON.parse(data.choices[0].message.content);

            const updates = {
                diagnosis: result.diagnosis,
                name: result.name,
                handle: result.handle,
                bio: result.bio,
                stats: result.stats,
                highlights: result.highlights,
                pinned_posts: result.pinned_posts
            };

            setLocalData(prev => ({ ...prev, ...updates }));
            await updateSocialData.mutateAsync({ updates, silent: true });
            setStep("tela2");

        } catch (error: any) {
            console.error(error);
            toast.error("Erro na geração: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveAll = async () => {
        try {
            await updateSocialData.mutateAsync({ updates: localData });
            toast.success("Estratégia salva com sucesso!", {
                action: {
                    label: "Ver Perfil",
                    onClick: () => setStep("tela2")
                }
            });
        } catch (error) {
            // Error handled by mutation
        }
    };

    // Render screens
    if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className={cn(
            "w-full mx-auto min-h-[600px] flex flex-col transition-all duration-500",
            step === "tela3b" ? "max-w-3xl" : "max-w-4xl"
        )}>
            {step === "tela1" && (
                <div className="flex-1 flex flex-col items-center justify-center space-y-10 animate-in fade-in zoom-in-95 duration-700 text-center py-10 px-6">
                    <div className="space-y-6 max-w-xl">
                        <div className="w-24 h-24 rounded-[32px] bg-primary/10 flex items-center justify-center mx-auto text-primary animate-pulse">
                            <Sparkles className="w-12 h-12" />
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-4xl font-black tracking-tight leading-tight italic">Mecanismo Único de <span className="text-primary not-italic">Otimização</span></h1>
                            <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                                Sua identidade visual no Instagram deve ser o reflexo claro do seu DNA. A Yah irá mapear sua persona e tese para gerar sua bio e destaques magnéticos.
                            </p>
                        </div>
                    </div>

                    <div className="w-full max-w-md space-y-6">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleUploadPrint}
                        />
                        <Button
                            size="lg"
                            className="w-full h-20 rounded-[28px] gradient-primary text-white font-black text-xl gap-4 shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                            onClick={() => handleGenerateDiagnosis()}
                            disabled={isProcessing || isGenerating}
                        >
                            {isProcessing || isGenerating ? (
                                <Loader2 className="animate-spin w-8 h-8" />
                            ) : (
                                <>
                                    <Wand2 className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                                    Gerar informações ideais
                                </>
                            )}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50"></span></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black text-muted-foreground tracking-widest"><span className="bg-background px-4">ou analise seu atual</span></div>
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-6 border-2 border-dashed border-primary/20 rounded-[24px] flex items-center justify-center gap-3 text-sm font-bold opacity-60 hover:opacity-100 hover:bg-primary/5 transition-all"
                        >
                            <Camera className="w-5 h-5" />
                            Subir print para diagnóstico
                        </button>

                        {(localData.diagnosis || localData.print_url) && (
                            <Button
                                variant="outline"
                                onClick={() => setStep("tela2")}
                                className="w-full h-16 rounded-[24px] border-primary/20 text-primary font-black uppercase tracking-widest gap-2 bg-primary/5 hover:bg-primary/10"
                            >
                                <Instagram className="w-5 h-5" />
                                Visualizar Perfil Criado
                            </Button>
                        )}
                    </div>

                    {(isProcessing || isGenerating) && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
                            <p className="text-primary font-black tracking-[0.2em] uppercase text-[10px] animate-pulse">Yah IA está processando sua identidade...</p>
                            <div className="w-48 h-1 bg-primary/10 rounded-full mx-auto overflow-hidden">
                                <div className="w-full h-full bg-primary animate-progress" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {step === "tela2" && (
                <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-500 pb-10 items-center">
                    {/* Simulator Header (Matches image 0) */}
                    <div className="w-full max-w-[380px] flex items-center justify-between p-4 bg-background z-20">
                        <div /> {/* Spacer to keep title centered or button right */}
                        <h2 className="font-bold text-lg">Simulador de Perfil</h2>
                        <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 h-8 text-xs font-bold"
                            onClick={handleSaveAll}
                        >
                            Salvar alterações
                        </Button>
                    </div>

                    {/* Diagnosis Alert - Floating or slightly above phone */}

                    {/* Phone Container */}
                    <div className="relative w-full max-w-[380px] aspect-[9/19] bg-background border-[8px] border-secondary/50 rounded-[50px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">

                        {/* Status Bar Mock */}
                        <div className="h-10 w-full flex items-center justify-between px-8 shrink-0">
                            <span className="text-[10px] font-bold">9:41</span>
                            <div className="flex gap-1.5 items-center">
                                <div className="w-3.5 h-1.5 border border-foreground/50 rounded-sm" />
                                <div className="w-3 h-3 border border-foreground/50 rounded-full" />
                            </div>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white text-black">

                            {/* Profile Header Block */}
                            <div className="px-5 pt-2 pb-5 space-y-4">
                                <div className="flex items-start gap-4">
                                    {/* Photo */}
                                    <div className="relative shrink-0">

                                        <div className="w-[86px] h-[86px] rounded-full border-2 border-slate-100 p-1 bg-white">
                                            <div className="w-full h-full rounded-full bg-slate-50 p-0.5 relative group overflow-hidden">
                                                {localData.profile_image_url ? (
                                                    <img src={localData.profile_image_url} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
                                                        <Camera className="w-6 h-6 text-slate-400" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => profilePhotoInputRef.current?.click()}>
                                                    <Plus className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-1 right-2 w-6 h-6 bg-slate-900 rounded-full border-2 border-white flex items-center justify-center text-white cursor-pointer" onClick={() => profilePhotoInputRef.current?.click()}>
                                            <Plus className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="file"
                                            ref={profilePhotoInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleProfileImageUpload}
                                        />
                                    </div>

                                    {/* Stats and Identity Column */}
                                    <div className="flex-1 space-y-3 pt-1">
                                        {/* Name above stats */}
                                        <div className="px-2 group/id relative cursor-pointer hover:bg-slate-50 rounded-xl p-1 -ml-1 transition-colors" onClick={() => setStep("tela3a")}>
                                            <div className="flex items-center gap-1.5">
                                                <div className="font-bold text-sm tracking-tight">{localData.name || "Seu Nome"}</div>
                                                <div className="w-3 h-3 bg-[#0095f6] rounded-full flex items-center justify-center">
                                                    <Check className="w-2 h-2 text-white" />
                                                </div>
                                                <Pencil className="w-2.5 h-2.5 text-primary/0 group-hover/id:text-primary/30 transition-colors" />
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-medium">Digital Creator</div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex justify-between items-center px-2">
                                            <div className="text-center">
                                                <div className="text-sm font-bold">{localData.stats?.posts || 0}</div>
                                                <div className="text-[10px] text-slate-500">posts</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-bold">{(localData.stats?.followers || 0).toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-500">seguid...</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-bold">{(localData.stats?.following || 0).toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-500">seguindo</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bio Block */}
                                <div className="group relative p-3 -mx-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100">
                                    <div className="text-[11px] text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                                        {localData.bio || "Sua bio estratégica gerada pela YAh aparecerá aqui..."}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-slate-200"
                                        onClick={() => setStep("tela3a")}
                                    >
                                        <Pencil className="w-3 h-3 text-primary" />
                                    </Button>
                                    <div className="flex items-center gap-1.5 mt-1 relative group/link px-3 -ml-3 rounded-lg hover:bg-slate-100/50 transition-colors cursor-pointer" onClick={() => setStep("tela3a")}>
                                        <Link className="w-3 h-3 text-blue-600" />
                                        <span className="text-[11px] text-blue-600 font-bold hover:underline">{localData.website || "adicionar link..."}</span>
                                    </div>
                                </div>

                                {/* Professional Panel (matching image 1) */}
                                <div className="p-3.5 bg-slate-50/50 rounded-lg border border-slate-100 space-y-0.5">
                                    <div className="text-[11px] font-bold">Painel profissional</div>
                                    <div className="text-[11px] text-slate-500">28,3 mil visualizações nos últimos 30 dias.</div>
                                </div>

                                {/* Action Buttons (Matches image 1) */}
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 h-8 rounded-lg border-none bg-slate-100 text-slate-900 text-[11px] font-bold hover:bg-slate-200">Editar perfil</Button>
                                    <Button variant="outline" className="flex-1 h-8 rounded-lg border-none bg-slate-100 text-slate-900 text-[11px] font-bold hover:bg-slate-200">Compartilhar perfil</Button>
                                    <Button variant="outline" className="w-10 h-8 rounded-lg border-none bg-slate-100 text-slate-900 hover:bg-slate-200 shrink-0 flex items-center justify-center p-0">
                                        <UserSquare className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Highlights section */}
                                <div className="space-y-3 pt-2">
                                    <h3 className="text-xs font-bold text-slate-900">Destaques</h3>
                                    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                        {localData.highlights?.map((highlight, idx) => (
                                            <div key={idx} className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0" onClick={() => { setHighlightIndex(idx); setStep("tela3b"); }}>
                                                <div className="w-[66px] h-[66px] rounded-full border border-slate-200 p-0.5 bg-white flex items-center justify-center relative">
                                                    <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center overflow-hidden">
                                                        {highlight.cover_url ? (
                                                            <img src={highlight.cover_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <ImageIcon className="w-6 h-6 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm">
                                                        <Pencil className="w-2.5 h-2.5 text-primary" />
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-600 truncate w-16 text-center">{highlight.title || "Destaque"}</span>
                                            </div>
                                        ))}
                                        {/* + IA / + Adicionado suggested in image 0 */}
                                        <div className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0" onClick={() => { setHighlightIndex(localData.highlights?.length || 0); setStep("tela3b"); }}>
                                            <div className="w-[66px] h-[66px] rounded-full border border-primary/20 p-0.5 bg-primary/5 flex items-center justify-center">
                                                <Sparkles className="w-6 h-6 text-primary" />
                                            </div>
                                            <span className="text-[10px] font-medium text-primary text-center">+ IA</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0" onClick={() => { setHighlightIndex(localData.highlights?.length || 0); setStep("tela3b"); }}>
                                            <div className="w-[66px] h-[66px] rounded-full border border-slate-200 p-0.5 bg-white flex items-center justify-center">
                                                <Plus className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-400 text-center">+ Adicionar</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Pinned Posts Grid */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-slate-900">Posts Fixados</h3>
                                        <div className="flex gap-2">
                                            <Grid className="w-3.5 h-3.5 text-slate-400" />
                                            <div className="w-4 h-3.5 flex flex-col justify-center gap-0.5 border border-slate-200 rounded-[2px] p-0.5">
                                                <div className="w-full h-[1px] bg-slate-200" />
                                                <div className="w-full h-[1px] bg-slate-200" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-[1px]">
                                        {localData.pinned_posts?.map((post, idx) => (
                                            <div key={idx} className="aspect-square relative group cursor-pointer bg-slate-100 overflow-hidden" onClick={() => { setPostIndex(idx); setStep("tela3c"); }}>
                                                {post.thumbnail_url ? (
                                                    <img src={post.thumbnail_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-slate-50 to-slate-200">
                                                        <Sparkles className="w-5 h-5 text-primary/20 mb-2" />
                                                        <span className="text-[8px] font-bold leading-tight uppercase text-slate-400">{post.type === 'pain' ? 'DOR' : post.type === 'process' ? 'MÉTODO' : 'PROVA'}</span>
                                                    </div>
                                                )}

                                                {/* Post Info Mock (matching image 1) */}
                                                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 group/stats">
                                                    {post.type === 'process' ? <PlayCircle className="w-3 h-3 text-white fill-white" /> : <div className="w-2.5 h-2.5 rounded-full border border-white/80" />}
                                                    <span className="text-[9px] font-bold text-white drop-shadow-sm">
                                                        {post.type === 'pain' ? '2.156' : post.type === 'process' ? '11,3 mil' : '7.270'}
                                                    </span>
                                                </div>

                                                <div className="absolute top-1.5 right-1.5">
                                                    <div className="rotate-45">
                                                        <div className="w-3 h-3 border-t-2 border-r-2 border-white/90" />
                                                    </div>
                                                </div>

                                                <div className="absolute inset-x-2 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button className="w-full h-6 px-0 text-[9px] font-bold bg-primary/90 text-white rounded-md shadow-xl">Editar</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="text-center pt-2">
                                    <button className="text-[10px] text-slate-400 font-medium hover:text-slate-600">Enviar novo print do perfil</button>
                                </div>
                            </div>

                            {/* Bottom Tabs Mock (image 1 matching) */}
                            <div className="mt-4 border-b border-slate-100 flex h-11 shrink-0 bg-white sticky top-0 z-10">
                                <div className="flex-1 flex items-center justify-center relative">
                                    <Grid className="w-6 h-6 text-black" />
                                    <div className="absolute bottom-0 left-[10%] right-[10%] h-[1.5px] bg-black" />
                                </div>
                                <div className="flex-1 flex items-center justify-center opacity-30">
                                    <PlayCircle className="w-6 h-6" />
                                </div>
                                <div className="flex-1 flex items-center justify-center opacity-30">
                                    <UserSquare className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Home Indicator */}
                        <div className="h-6 w-full flex justify-center items-center shrink-0">
                            <div className="w-24 h-1 bg-slate-200 rounded-full" />
                        </div>
                    </div>
                </div>
            )}

            {/* Screen 3A: Bio Edit */}
            {step === "tela3a" && (
                <Screen3A data={localData} onBack={() => setStep("tela2")} onSave={(updates) => { setLocalData({ ...localData, ...updates }); markAsDirty(); }} updateSocialData={updateSocialData} markAsDirty={markAsDirty} />
            )}

            {/* Screen 3B: Highlights Edit */}
            {step === "tela3b" && (
                <Screen3B data={localData} brand={brand} initialIndex={highlightIndex} onBack={() => setStep("tela2")} onSave={(updates) => { setLocalData({ ...localData, ...updates }); markAsDirty(); }} updateSocialData={updateSocialData} markAsDirty={markAsDirty} />
            )}

            {/* Screen 3C: Pinned Posts Edit */}
            {step === "tela3c" && (
                <Screen3C data={localData} brand={brand} initialIndex={postIndex} onBack={() => setStep("tela2")} onSave={(updates) => { setLocalData({ ...localData, ...updates }); markAsDirty(); }} updateSocialData={updateSocialData} markAsDirty={markAsDirty} />
            )}
        </div>
    );
}

// SUB-COMPONENTS FOR STEP 3A/B/C
function Screen3A({ data, onBack, onSave, updateSocialData, markAsDirty }: { data: any, onBack: () => void, onSave: (updates: any) => void, updateSocialData: any, markAsDirty: () => void }) {
    const { getSetting } = useSystemSettings();
    const [bio, setBio] = useState(data.bio || "");
    const [chatInput, setChatInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleRefineBio = async () => {
        if (!chatInput.trim() && !bio) return;
        setIsGenerating(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            const prompt = `Refine a bio do Instagram abaixo de acordo com este pedido: "${chatInput || 'Crie uma variação estratégica premium'}".
            
            BIO ATUAL:
            ${bio}

            MODELO OBRIGATÓRIO (4 LINHAS):
            1. Identidade específica + validação de dor real.
            2. Nome do mecanismo único ou método próprio.
            3. Resultado concreto, específico e verificável.
            4. CTA direto e funcional.

            REGRAS CRÍTICAS:
            • MÁXIMO 150 CARACTERES.
            • Nunca usar frases genéricas, motivacionais ou vazias (ex: "ajudo pessoas", "transformando vidas").
            • Adaptar ao DNA da marca e tom de voz: ${data.diagnosis || ''}.
            • Retorne APENAS o texto final da bio no formato de 4 linhas, sem aspas e sem comentários.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um mestre em copywriting para Instagram. Retorne apenas o texto final da bio." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            if (!response.ok) throw new Error("Erro na IA");
            const aiData = await response.json();
            const refinedBio = aiData.choices[0].message.content.trim();

            setBio(refinedBio);
            // Persistent save
            await updateSocialData.mutateAsync({
                updates: { bio: refinedBio },
                silent: true
            });

            setChatInput("");
            toast.success("Bio refinada com sucesso!");
        } catch (error: any) {
            toast.error("Erro no refinamento: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto w-full">
            <header className="flex items-center gap-4 mb-10">
                <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h2 className="text-2xl font-black italic">Edição Profunda da <span className="text-primary not-italic">Bio</span></h2>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                {/* Left Column: Identity & Bio (Main Content) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Identification Card */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-8 space-y-6 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 gradient-primary opacity-20" />
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <UserSquare className="w-5 h-5" />
                            </div>
                            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Identidade do Perfil</Label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 ml-1">Nome de Exibição</Label>
                                <Input
                                    className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 text-sm focus-visible:ring-primary/20 transition-all hover:bg-white/10"
                                    placeholder="Ex: Mariana | Organização"
                                    value={data.name || ""}
                                    onChange={(e) => onSave({ name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 ml-1">Link (Website)</Label>
                                <div className="relative">
                                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                    <Input
                                        className="h-14 bg-white/5 border-white/5 rounded-2xl pl-12 pr-6 text-sm focus-visible:ring-primary/20 transition-all hover:bg-white/10"
                                        placeholder="linktree.com/suamarca"
                                        value={data.website || ""}
                                        onChange={(e) => onSave({ website: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bio Card */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-8 space-y-4 backdrop-blur-sm relative group bg-gradient-to-b from-transparent to-primary/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <Pencil className="w-5 h-5" />
                                </div>
                                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Texto da Bio</Label>
                            </div>
                            <span className={cn(
                                "text-[10px] font-black tracking-widest px-3 py-1 rounded-full bg-white/5",
                                bio.length > 150 ? "text-red-500 animate-pulse bg-red-500/10" : "text-muted-foreground/50"
                            )}>
                                {bio.length} / 150
                            </span>
                        </div>

                        <div className="relative group h-full flex flex-col pt-2">
                            <Textarea
                                className={cn(
                                    "flex-1 min-h-[320px] bg-slate-900/50 border-white/5 rounded-[24px] p-8 text-lg font-medium leading-relaxed focus-visible:ring-primary/20 resize-none no-scrollbar shadow-inner transition-all",
                                    bio.length > 150 && "border-red-500/50 bg-red-500/5"
                                )}
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Sua bio estratégica..."
                            />
                            <div className="absolute inset-0 rounded-[24px] border border-white/5 pointer-events-none group-hover:border-primary/20 transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Refinement (Copilot) */}
                <div className="lg:col-span-5 space-y-6 flex flex-col">
                    <div className="bg-slate-900/60 border border-white/10 rounded-[40px] p-8 flex flex-col justify-between flex-1 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[96px] rounded-full -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity" />

                        <div className="space-y-8 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
                                    <Brain className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black italic uppercase tracking-tighter">Copiloto <span className="text-primary not-italic">Yah</span></h3>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Refinamento Inteligente</p>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground/80 leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                                "Peça variações, ajuste o tom de voz ou foque o mecanismo único na sua oferta atual."
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                {["Mais autoridade", "Mais leve", "Foco em venda", "Curta e direta"].map(hint => (
                                    <button
                                        key={hint}
                                        onClick={() => setChatInput(hint)}
                                        className="text-[10px] uppercase font-black tracking-tight py-3 px-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-muted-foreground hover:text-white border border-white/5 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {hint}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10 pt-10">
                            <div className="relative">
                                <Input
                                    className="h-20 bg-slate-900/80 border-white/10 rounded-3xl pl-8 pr-20 text-sm focus-visible:ring-primary/20 placeholder:text-muted-foreground/30 font-medium shadow-2xl"
                                    placeholder="Ex: Deixe mais focado em..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRefineBio()}
                                />
                                <Button
                                    size="icon"
                                    className="absolute right-4 top-4 h-12 w-12 rounded-2xl gradient-primary shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                                    onClick={handleRefineBio}
                                    disabled={isGenerating || (!chatInput.trim() && !bio)}
                                >
                                    {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <Button
                            className="w-full h-24 rounded-[32px] text-xl font-black gradient-primary shadow-2xl shadow-primary/20 flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                            onClick={() => {
                                onSave({ bio });
                                onBack();
                                toast.success("Bio salva com sucesso no mockup!");
                            }}
                        >
                            <div className="p-3 bg-white/20 rounded-2xl group-hover:rotate-6 transition-transform">
                                <Save className="w-8 h-8 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="leading-none">Salvar Bio</div>
                                <div className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Atualizar Mockup</div>
                            </div>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const AutoResizeTextarea = (props: AutoResizeTextareaProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [props.value]);

    return (
        <Textarea
            {...props}
            ref={textareaRef}
            onInput={(e) => {
                adjustHeight();
                if (props.onInput) props.onInput(e);
            }}
            style={{ ...props.style, overflow: 'hidden', resize: 'none' }}
        />
    );
};

function Screen3B({ data, brand, initialIndex = 0, onBack, onSave, updateSocialData, markAsDirty }: { data: any, brand: any, initialIndex?: number, onBack: () => void, onSave: (updates: any) => void, updateSocialData: any, markAsDirty: () => void }) {
    const { getSetting } = useSystemSettings();
    const [highlights, setHighlights] = useState(data.highlights || []);
    const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
    const [insightGeneratingIdx, setInsightGeneratingIdx] = useState<number | null>(null);
    const [contentGeneratingIdx, setContentGeneratingIdx] = useState<number | null>(null);
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const scrollRef = useRef<HTMLDivElement>(null);
    const highlightRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        // Multiple attempts to ensure scroll happens after layout stabilizes
        const scroll = () => scrollToIndex(initialIndex);

        const timers = [
            setTimeout(scroll, 50),   // Immediate
            setTimeout(scroll, 200),  // Mid-animation
            setTimeout(scroll, 500)   // End-animation
        ];

        return () => timers.forEach(clearTimeout);
    }, [initialIndex]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!scrollRef.current) return;
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.clientWidth;
        if (width > 0) {
            const index = Math.round(scrollLeft / width);
            if (index !== activeIndex && index >= 0 && index < highlights.length) {
                setActiveIndex(index);
            }
        }
    };

    const scrollToIndex = (index: number) => {
        const el = highlightRefs.current[index];
        if (el) {
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
            setActiveIndex(index);
        } else if (index < highlights.length) {
            // Retry once if element not yet available
            setTimeout(() => {
                const retryEl = highlightRefs.current[index];
                if (retryEl) {
                    retryEl.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                    });
                    setActiveIndex(index);
                }
            }, 150);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
        const file = e.target.files?.[0];
        if (!file || !brand) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("O arquivo deve ter menos de 5MB.");
            return;
        }

        setGeneratingIdx(idx);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `highlight_covers/${brand.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("brand_documents")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("brand_documents")
                .getPublicUrl(filePath);

            const newHighlights = [...highlights];
            newHighlights[idx].cover_url = publicUrl;
            setHighlights(newHighlights);

            await updateSocialData.mutateAsync({
                updates: { highlights: newHighlights },
                silent: true
            });

            toast.success("Capa enviada com sucesso!");
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error("Erro ao enviar capa.");
        } finally {
            setGeneratingIdx(null);
            if (e.target) e.target.value = "";
        }
    };

    const handleDownloadCover = async (url: string, title: string) => {
        if (!url) return;

        const toastId = toast.loading("Preparando download...");
        try {
            // Add cache-busting to bypass aggressive caching
            const fetchUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;

            const response = await fetch(fetchUrl, {
                mode: 'cors',
                credentials: 'omit'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            // Ensure filename is clean
            const safeTitle = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            link.download = `capa-${safeTitle || 'destaque'}.png`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Short delay before revoking to ensure click handled
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);

            toast.success("Download concluído!", { id: toastId });
        } catch (error: any) {
            console.error("Download error:", error);
            toast.error("Erro no download direto. Abrindo em nova aba...", { id: toastId });
            // Fallback: Just open the URL in a new tab
            window.open(url, '_blank');
        }
    };

    const handleGenerateImage = async (idx: number, promptText: string) => {
        if (!promptText) {
            toast.error("Por favor, defina um título para o destaque primeiro");
            return;
        }
        setGeneratingIdx(idx);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    prompt: `Premium minimalist flat icon for Instagram highlight cover. Subject: ${promptText}. Stylized clean minimalist graphic, high-contrast solid bold background color, professional luxury branding, simple geometric design, vector style, flat design, no textures, no photorealism, no human faces.`,
                    n: 1,
                    size: "1024x1024"
                })
            });
            const res = await response.json();

            if (res.error) throw new Error(res.error.message);

            const tempUrl = res.data[0].url;

            // PERSISTENCE: Download from OpenAI and Upload to Supabase
            const imageRes = await fetch(tempUrl);
            const imageBlob = await imageRes.blob();

            const fileName = `ai_${Math.random().toString(36).substring(2)}_${Date.now()}.png`;
            const filePath = `highlight_covers/${brand.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("brand_documents")
                .upload(filePath, imageBlob);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("brand_documents")
                .getPublicUrl(filePath);

            const newHighlights = [...highlights];
            newHighlights[idx].cover_url = publicUrl;
            setHighlights(newHighlights);

            // Persistent save
            await updateSocialData.mutateAsync({
                updates: { highlights: newHighlights },
                silent: true
            });

            toast.success("Ícone gerado e salvo com sucesso!");
        } catch (e: any) {
            console.error("Error generating/persisting icon:", e);
            toast.error("Erro ao gerar ícone: " + e.message);
        } finally {
            setGeneratingIdx(null);
        }
    };

    const handleGenerateInsights = async (idx: number, type: string, title: string) => {
        if (!title) {
            toast.error("Por favor, defina um título para o destaque primeiro");
            return;
        }
        setInsightGeneratingIdx(idx);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            const brandContext = brand ? `
        Persona: ${brand.dna_persona_data?.name || 'Não definido'}
        Nicho: ${brand.dna_nicho || 'Não definido'}
        Produto: ${brand.dna_produto || 'Não definido'}
        Diferencial: ${brand.dna_diferencial || 'Não definido'}
        Tese: ${brand.dna_tese || 'Não definida'}
        Tom de Voz: ${brand.result_tom_voz || 'Não definido'}
      ` : '';

            let specificPrompt = "";
            if (type === 'transformation') {
                specificPrompt = "Gerar explicações específicas do que deve compor um destaque de transformação: microvitórias, evidências visuais, progresso, antes/depois sem rosto, contrastes claros, gatilhos de credibilidade e cenas que façam o público enxergar a mudança.";
            } else if (type === 'journey') {
                specificPrompt = "Gerar através do card DNA de marca e personalidade a explicação clara de como estruturar o destaque de jornada. Incluir: etapas do método, bastidores, o que acontece por dentro, como o processo conduz à transformação. Acrescentar bloco ‘Quem está por trás’, ‘Pra quem é’ e ‘Pra quem NÃO é’ para aumentar segurança cognitiva do público do usuário";
            } else if (type === 'faq') {
                specificPrompt = "Gerar lista de dúvidas reais do público, microexplicações claras, CTA objetivo. Priorizar próximo passo de baixo risco: teste, conversa, mini-formulário, amostra guiada. Evitar respostas genéricas.";
            } else {
                specificPrompt = "Gerar estrutura igual aos três destaques principais, adaptada ao tema escolhido pelo usuário.";
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um estrategista de marca e especialista em Instagram premium. Saída curta e estratégica." },
                        { role: "user", content: `CONTEXTO DA MARCA: ${brandContext}\n\nTITULO DO DESTAQUE: ${title}\n\nOBJETIVO: ${specificPrompt}\n\nGere 3 tópicos curtos e poderosos sobre o que deve conter na descrição deste destaque.` }
                    ]
                })
            });
            const res = await response.json();

            if (res.error) throw new Error(res.error.message);

            const content = res.choices[0].message.content;
            const newHighlights = [...highlights];
            newHighlights[idx].description = content;
            setHighlights(newHighlights);

            // Persistent save
            await updateSocialData.mutateAsync({
                updates: { highlights: newHighlights },
                silent: true
            });

            toast.success("Sugestões da IA geradas!");
        } catch (e: any) {
            toast.error("Erro ao gerar sugestões: " + e.message);
        } finally {
            setInsightGeneratingIdx(null);
        }
    };

    const handleGenerateContent = async (idx: number, type: string, title: string, insights: string) => {
        if (!insights) {
            toast.error("Por favor, gere as sugestões primeiro");
            return;
        }
        setContentGeneratingIdx(idx);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            const brandContext = brand ? `
        Persona: ${brand.dna_persona_data?.name || 'Não definido'}
        Nicho: ${brand.dna_nicho || 'Não definido'}
        Produto: ${brand.dna_produto || 'Não definido'}
        Diferencial: ${brand.dna_diferencial || 'Não definido'}
        Tom de Voz: ${brand.result_tom_voz || 'Não definido'}
      ` : '';

            let specificPrompt = "";
            if (type === 'transformation') {
                specificPrompt = "Gerar roteiro estruturado para montar o destaque de transformação com exemplos reais. Dizer o que NÃO colocar (frases genéricas, promessas milagrosas, dados inventados). Deixar sempre uma frase final que é o que ele gostaria de visualizar para comprar um serviço ou produto.";
            } else if (type === 'journey') {
                specificPrompt = "Gerar roteiro detalhado do processo/método, incluindo etapas, bastidores e o que acontece por dentro. Gerar exemplos de descrição do processo sem promessas vazias.";
            } else if (type === 'faq') {
                specificPrompt = "Gerar roteiro de dúvidas frequentes com microexplicações claras e CTA objetivo de baixo risco.";
            } else {
                specificPrompt = "Gerar roteiro estruturado adaptado ao tema.";
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um roteirista de mídias sociais e estrategista de branding. Saída estruturada por [STORY]." },
                        { role: "user", content: `CONTEXTO DA MARCA: ${brandContext}\n\nTITULO: ${title}\n\nINSIGHTS: ${insights}\n\nOBJETIVO: ${specificPrompt}\n\nCrie um roteiro detalhado de 3 a 5 stories. Use exatamente o marcador [STORY] antes de cada story.` }
                    ]
                })
            });
            const res = await response.json();

            if (res.error) throw new Error(res.error.message);

            const contentResult = res.choices[0].message.content;
            const newHighlights = [...highlights];
            newHighlights[idx].content = contentResult;
            setHighlights(newHighlights);

            // Persistent save
            await updateSocialData.mutateAsync({
                updates: { highlights: newHighlights },
                silent: true
            });

            toast.success("Roteiro gerado com sucesso!");
        } catch (e: any) {
            toast.error("Erro ao gerar roteiro: " + e.message);
        } finally {
            setContentGeneratingIdx(null);
        }
    };

    const handleShareWhatsApp = (h: any) => {
        const text = `*Estratégia de Destaque: ${h.title}*\n\n*Insights:*\n${h.description}\n\n*Roteiro Detalhado:*\n${h.content?.replace(/\[STORY\]/g, '\n---\n')}`;
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    const handleShareAllStories = (h: any) => {
        if (!h.content) return;

        const stories = h.content.split('[STORY]').filter(Boolean);
        let text = `*🚀 TODOS OS STORIES: ${h.title.toUpperCase()}*\n\n`;

        stories.forEach((story, idx) => {
            text += `*STORY ${idx + 1}*\n${story.trim()}\n\n---\n\n`;
        });

        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    return (
        <div className="flex-1 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
                    <h2 className="text-xl sm:text-2xl font-black truncate">Estratégia dos Destaques</h2>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl gap-2 w-full sm:w-auto h-11" onClick={() => setHighlights([...highlights, { title: "Novo", description: "", cover_url: "", type: "custom" }])}>
                    <Plus className="w-4 h-4" /> Novo Destaque
                </Button>
            </div>

            {/* Carousel Navigation Info */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-6 mt-2 sm:mt-0">
                    <div className="flex gap-1.5 order-2 sm:order-1">
                        {highlights.map((_: any, i: number) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    activeIndex === i ? "w-6 bg-primary" : "w-1.5 bg-primary/20"
                                )}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-2 order-1 sm:order-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20"
                            onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
                            disabled={activeIndex === 0}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-9 px-4 rounded-full font-black text-[10px] uppercase tracking-wider gradient-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-20 flex items-center gap-2"
                            onClick={() => scrollToIndex(Math.min(highlights.length - 1, activeIndex + 1))}
                            disabled={activeIndex === highlights.length - 1}
                        >
                            <span>Próximo</span>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 text-center sm:text-right w-full sm:w-auto bg-white/5 sm:bg-transparent py-1.5 sm:py-0 rounded-full sm:rounded-none">
                    Visualizando {activeIndex + 1} de {highlights.length}
                </span>
            </div>

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar pb-10"
            >
                {highlights.map((h: any, idx: number) => (
                    <div
                        key={idx}
                        ref={el => highlightRefs.current[idx] = el}
                        className="w-full shrink-0 snap-center relative group/card px-4"
                    >
                        {/* Glow Background Effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent rounded-[2.5rem] blur opacity-0 group-hover/card:opacity-100 transition duration-700" />

                        <Card className="relative bg-background/40 backdrop-blur-2xl border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:translate-y-[-4px] hover:border-primary/20">
                            {/* Visual Header */}
                            <div className="p-4 sm:p-6 pb-4 flex flex-col items-center gap-4 sm:gap-6">
                                <div className="relative group/cover cursor-pointer">
                                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-primary/20 p-1.5 group-hover/cover:border-primary/40 transition-all duration-500">
                                        <div className="w-full h-full rounded-full bg-secondary/20 flex items-center justify-center overflow-hidden border border-white/5">
                                            {generatingIdx === idx ? (
                                                <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                </div>
                                            ) : h.cover_url ? (
                                                <img src={h.cover_url} className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-110" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1.5 opacity-40">
                                                    <Camera className="w-8 h-8" />
                                                    <span className="text-[9px] font-black uppercase tracking-tighter">Capa</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 flex gap-1">
                                        <label className="h-9 w-9 rounded-full bg-primary shadow-xl shadow-primary/20 flex items-center justify-center border-4 border-background cursor-pointer hover:scale-110 transition-all" title="Anexar Foto">
                                            <Upload className="w-4 h-4 text-white" />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleCoverUpload(e, idx)} />
                                        </label>
                                        <div className="h-9 w-9 rounded-full bg-primary shadow-xl shadow-primary/20 flex items-center justify-center border-4 border-background cursor-pointer hover:scale-110 transition-all" onClick={() => handleGenerateImage(idx, h.title)} title="Gerar com IA">
                                            <Wand2 className="w-4 h-4 text-white" />
                                        </div>
                                        {h.cover_url && (
                                            <div className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md shadow-xl flex items-center justify-center border-4 border-background cursor-pointer hover:scale-110 transition-all" onClick={() => handleDownloadCover(h.cover_url, h.title)} title="Baixar Capa">
                                                <Download className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full space-y-4">
                                    <div className="text-center space-y-2">
                                        <Label className="text-[9px] uppercase font-black tracking-[0.3em] text-muted-foreground/40 leading-none">Título do Destaque</Label>
                                        <Input
                                            className="font-black text-center uppercase tracking-widest text-lg h-12 rounded-2xl bg-white/5 border-white/5 focus-visible:ring-primary/20 transition-all group-hover/card:bg-white/10"
                                            value={h.title}
                                            placeholder={h.type === 'transformation' ? 'EX: RESULTADOS' : h.type === 'journey' ? 'EX: MÉTODO' : 'EX: FAQ'}
                                            onChange={(e) => {
                                                const n = [...highlights];
                                                n[idx].title = e.target.value;
                                                setHighlights(n);
                                                markAsDirty();
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="px-4 sm:px-6 py-6 space-y-6 bg-gradient-to-b from-white/[0.02] to-transparent border-t border-white/5">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary/60">
                                        <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                                        <Label className="text-[10px] uppercase font-black tracking-widest">Estratégia de Conteúdo</Label>
                                    </div>
                                    <AutoResizeTextarea
                                        className="text-xs font-medium leading-relaxed rounded-2xl bg-white/5 border-white/5 focus-visible:ring-primary/20 transition-all p-4"
                                        placeholder={
                                            h.type === 'transformation' ? 'Lógica da transformação: antes/depois, vitórias, evidências claras...' :
                                                h.type === 'journey' ? 'Processo/método, experiência e bastidores do seu DNA...' :
                                                    'Dúvidas reais, autoridade e CTA de baixo risco...'
                                        }
                                        value={h.description}
                                        onChange={(e) => {
                                            const n = [...highlights];
                                            n[idx].description = e.target.value;
                                            setHighlights(n);
                                            markAsDirty();
                                        }}
                                    />
                                </div>

                                {
                                    h.type === 'journey' && (
                                        <div className="space-y-4 p-5 bg-primary/5 rounded-[2rem] border border-primary/10 animate-in fade-in duration-500">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-primary/50 ml-1">Quem está por trás</Label>
                                                <Input
                                                    className="h-12 text-xs rounded-xl bg-white/5 border-white/5 focus:bg-white/10 transition-all font-medium"
                                                    value={h.who_behind || ""}
                                                    placeholder="Sua história, autoridade..."
                                                    onChange={(e) => {
                                                        const n = [...highlights];
                                                        n[idx].who_behind = e.target.value;
                                                        setHighlights(n);
                                                        markAsDirty();
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest text-primary/50 ml-1">Ideal para</Label>
                                                    <Input
                                                        className="h-12 text-xs rounded-xl bg-white/5 border-white/5 hover:bg-white/10 transition-all font-medium"
                                                        value={h.for_who || ""}
                                                        placeholder="Público-alvo..."
                                                        onChange={(e) => {
                                                            const n = [...highlights];
                                                            n[idx].for_who = e.target.value;
                                                            setHighlights(n);
                                                            markAsDirty();
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest text-red-500/50 ml-1">Não é para</Label>
                                                    <Input
                                                        className="h-12 text-xs rounded-xl bg-red-500/5 border-red-500/10 focus-visible:ring-red-500/20 hover:bg-red-500/10 transition-all font-medium"
                                                        value={h.not_for_who || ""}
                                                        placeholder="Quem você não atende..."
                                                        onChange={(e) => {
                                                            const n = [...highlights];
                                                            n[idx].not_for_who = e.target.value;
                                                            setHighlights(n);
                                                            markAsDirty();
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }

                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40 flex items-center gap-2">
                                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
                                        URL Estratégica
                                    </Label>
                                    <div className="relative">
                                        <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                                        <Input
                                            className="h-14 pl-12 text-xs rounded-2xl bg-white/5 border-white/5 focus:bg-white/10 transition-all font-mono"
                                            value={h.link || ""}
                                            placeholder="https://sua-oferta.com"
                                            onChange={(e) => {
                                                const n = [...highlights];
                                                n[idx].link = e.target.value;
                                                setHighlights(n);
                                                markAsDirty();
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Buttons Footer */}
                            < div className="p-4 sm:p-6 space-y-6" >
                                <div className="flex flex-col gap-3">
                                    <Button
                                        size="lg"
                                        variant="ghost"
                                        className="w-full h-14 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary transition-all group/ia border border-primary/20"
                                        onClick={() => handleGenerateInsights(idx, h.type, h.title)}
                                        disabled={insightGeneratingIdx !== null}
                                    >
                                        <div className="flex items-center gap-3 w-full px-4">
                                            {insightGeneratingIdx === idx ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-5 h-5 group-hover/ia:rotate-12 transition-transform" />
                                            )}
                                            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-[0.2em] flex-1 text-left">Extrair Insights Premium</span>
                                            <ChevronRight className="w-4 h-4 opacity-20 group-hover/ia:opacity-100 group-hover/ia:translate-x-1 transition-all" />
                                        </div>
                                    </Button>

                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl border-primary/30 hover:bg-primary/5 transition-all group/roteiro"
                                        onClick={() => handleGenerateContent(idx, h.type, h.title, h.description)}
                                        disabled={contentGeneratingIdx !== null || !h.description}
                                    >
                                        <div className="flex items-center gap-3 w-full px-4">
                                            {contentGeneratingIdx === idx ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            ) : (
                                                <TrendingUp className="w-5 h-5 text-primary group-hover/roteiro:scale-110 transition-transform" />
                                            )}
                                            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-[0.2em] flex-1 text-left">Criar Roteiro Estratégico</span>
                                            <ChevronRight className="w-4 h-4 opacity-20 group-hover/roteiro:opacity-100 group-hover/roteiro:translate-x-1 transition-all" />
                                        </div>
                                    </Button>
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                    <Button
                                        variant="secondary"
                                        className="flex-1 h-14 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/save px-2 sm:px-4"
                                        onClick={async () => {
                                            const n = [...highlights];
                                            await updateSocialData.mutateAsync({ updates: { highlights: n } });
                                            toast.success("Estratégia salva!");
                                        }}
                                    >
                                        <Save className="w-4 h-4 mr-1 sm:mr-2 group-hover/save:scale-110 transition-transform shrink-0" />
                                        <span className="truncate">Salvar Destaque</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-14 w-12 sm:w-14 p-0 rounded-2xl border-white/5 hover:bg-white/10 transition-all hover:border-green-500/30 group/ws shrink-0"
                                        onClick={() => handleShareWhatsApp(h)}
                                    >
                                        <MessageSquare className="w-4 h-4 text-green-500 group-hover/ws:scale-110 transition-transform" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="h-14 w-12 sm:w-14 p-0 rounded-2xl text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all group/del shrink-0"
                                        onClick={() => {
                                            const n = [...highlights];
                                            n[idx] = { ...n[idx], description: "", content: "", link: "", who_behind: "", for_who: "", not_for_who: "" };
                                            setHighlights(n);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 group-hover/del:scale-110 transition-transform" />
                                    </Button>
                                </div>

                                {
                                    h.content && (
                                        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                                            <div className="flex items-center gap-4">
                                                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/20" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">Script Sugerido</span>
                                                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/20" />
                                            </div>

                                            <div className="space-y-4">
                                                {h.content.split('[STORY]').filter(Boolean).map((story: string, sIdx: number) => (
                                                    <div key={sIdx} className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-3 relative group/story transition-all hover:bg-white/[0.06]">
                                                        <div className="absolute left-0 top-6 bottom-6 w-1 bg-primary rounded-r-full" />
                                                        <div className="flex items-center justify-between opacity-40">
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Story {sIdx + 1}</span>
                                                            <Sparkle className="w-3 h-3" />
                                                        </div>
                                                        <div className="text-[11px] leading-relaxed font-medium selection:bg-primary/20">
                                                            <AutoResizeTextarea
                                                                className="text-[11px] font-medium leading-relaxed bg-transparent border-none p-0 focus-visible:ring-0"
                                                                value={story.trim()}
                                                                onChange={(e) => {
                                                                    const rawStories = h.content.split('[STORY]');
                                                                    let count = 0;
                                                                    for (let i = 0; i < rawStories.length; i++) {
                                                                        if (rawStories[i].trim()) {
                                                                            if (count === sIdx) {
                                                                                rawStories[i] = e.target.value;
                                                                                break;
                                                                            }
                                                                            count++;
                                                                        }
                                                                    }
                                                                    const n = [...highlights];
                                                                    n[idx].content = rawStories.join('[STORY]');
                                                                    setHighlights(n);
                                                                    markAsDirty();
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                className="w-full h-14 rounded-2xl bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 transition-all gap-3 font-black text-[10px] uppercase tracking-widest mt-4"
                                                onClick={() => handleShareAllStories(h)}
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Compartilhar Todos os Stories
                                            </Button>
                                        </div>
                                    )}
                            </div>
                        </Card>
                    </div>
                ))}
            </div>

            <Button
                className="w-full h-20 rounded-3xl text-lg font-black gradient-primary shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 mt-12"
                onClick={() => { onSave({ highlights }); onBack(); toast.success("Estratégia salva!"); }}
            >
                <Save className="w-6 h-6" />
                Salvar Estratégia dos Destaques
            </Button>
        </div>
    );
}

function Screen3C({ data, brand, initialIndex = 0, onBack, onSave, updateSocialData, markAsDirty }: { data: any, brand: any, initialIndex?: number, onBack: () => void, onSave: (updates: any) => void, updateSocialData: any, markAsDirty: () => void }) {
    const { getSetting } = useSystemSettings();
    const [posts, setPosts] = useState(data.pinned_posts || []);
    const [generatingContentIdx, setGeneratingContentIdx] = useState<number | null>(null);
    const [generatingCoverIdx, setGeneratingCoverIdx] = useState<number | null>(null);
    const postRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (postRefs.current[initialIndex]) {
            setTimeout(() => {
                postRefs.current[initialIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [initialIndex]);

    const handleGeneratePostContent = async (idx: number) => {
        setGeneratingContentIdx(idx);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            const brandContext = brand ? `
                Persona: ${brand.dna_persona_data?.name || 'Não definido'}
                Nicho: ${brand.dna_nicho || 'Não definido'}
                Produto: ${brand.dna_produto || 'Não definido'}
                Diferencial: ${brand.dna_diferencial || 'Não definido'}
                Tese: ${brand.dna_tese || 'Não definida'}
                Tom de Voz: ${brand.result_tom_voz || 'Não definido'}
                Método: ${brand.dna_metodo || 'Não definido'}
            ` : '';

            let specificPrompt = "";
            const postType = posts[idx].type;

            if (postType === 'pain') {
                specificPrompt = "Gerar explicação profunda sobre a raiz da dor do público do usuário. Busque dados do card personalidade e DNA de marca. Evitar clichês. Criar metáforas, cenas e exemplos que façam o cérebro visualizar a situação. Construir promessa específica baseada no método do usuário.";
            } else if (postType === 'process') {
                specificPrompt = "Descrever o passo-a-passo do mecanismo usando o DNA de Marca, a Personalidade, o Tom de Voz e o Método do usuário. Explicar como a mudança acontece na prática, mostrando as funções reais do produto/serviço, o fluxo, o ambiente, a ferramenta e o que a pessoa experimenta. Gerar narrativa clara e específica, sem mistério e sem frases genéricas. Criar cenas realistas que representem o processo (ambiente de atendimento, ferramenta sendo usada, etapas visíveis). Transformar tudo isso em um roteiro estruturado que ajude o público a visualizar exatamente como o resultado é gerado.";
            } else if (postType === 'transformation') {
                specificPrompt = "Gerar narrativa de transformação com prova concreta, antes/depois sem rosto, depoimentos e finalização com CTA direto.";
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um estrategista de conteúdo para Instagram premium. Saída estruturada e visual." },
                        { role: "user", content: `CONTEXTO DA MARCA: ${brandContext}\n\nTEMA: ${posts[idx].theme}\n\nOBJETIVO: ${specificPrompt}\n\nCrie um roteiro de legenda para post fixado.` }
                    ]
                })
            });
            const res = await response.json();
            if (res.error) throw new Error(res.error.message);

            const content = res.choices[0].message.content;
            const newPosts = [...posts];
            newPosts[idx].content = content;
            setPosts(newPosts);

            await updateSocialData.mutateAsync({
                updates: { pinned_posts: newPosts },
                silent: true
            });

            toast.success("Roteiro gerado com sucesso!");
        } catch (e: any) {
            toast.error("Erro ao gerar roteiro: " + e.message);
        } finally {
            setGeneratingContentIdx(null);
        }
    };

    const handleGeneratePostCover = async (idx: number) => {
        setGeneratingCoverIdx(idx);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            const prompt = `Premium aesthetic professional cover for Instagram post. Type: ${posts[idx].type}. Theme: ${posts[idx].theme || 'Business strategy'}. Style: ultra-high-end luxury photography, cinematic lighting, professional branding, elegant textures, no faces.`;

            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    prompt,
                    n: 1,
                    size: "1024x1024"
                })
            });
            const res = await response.json();
            if (res.error) throw new Error(res.error.message);

            const newPosts = [...posts];
            newPosts[idx].thumbnail_url = res.data[0].url;
            setPosts(newPosts);

            await updateSocialData.mutateAsync({
                updates: { pinned_posts: newPosts },
                silent: true
            });

            toast.success("Capa gerada com sucesso!");
        } catch (e: any) {
            toast.error("Erro ao gerar capa: " + e.message);
        } finally {
            setGeneratingCoverIdx(null);
        }
    };

    const handleExportPost = (post: any) => {
        const text = `*Post Fixado: ${post.theme || 'Sem Tema'}*\n\n*Tipo:* ${post.type.toUpperCase()}\n\n*Roteiro/Legenda:*\n${post.content}\n\n*Link:* ${post.link || 'Não definido'}`;
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    const descriptions = {
        pain: {
            title: "Post 1 — Dor e Promessa",
            desc: "Ajudar o público a visualizar a própria dor (situação que ele vive) e entender por que essa dor existe.\n• Descreva o que causa essa dor\n• Traga clareza do que muda quando a pessoa resolve isso."
        },
        process: {
            title: "Post 2 — Processo / Ferramenta",
            desc: "Mostrar o “como” — o mecanismo que gera o resultado.\n• Objetivo: fazer o público visualizar como será feito a transformação, através de cenas reais da ferramenta, atendimento ou serviço.\n• Mostra o “como” → reduz medo de enganação."
        },
        transformation: {
            title: "Post 3 — Transformação + CTA",
            desc: "Mostrar o resultado real e guiar para a decisão.\n• Objetivo: fazer o público visualizar como o serviço ou produto aliviou a vida de alguém, através de depoimentos, feedbacks ou narrativas de antes e depois.\n• Finalize com um CTA direto e leve."
        }
    };

    return (
        <div className="flex-1 space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full bg-white/5 hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">Estratégia dos Posts Fixados</h2>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em] mt-1 opacity-50">Configuração de autoridade no topo do perfil</p>
                    </div>
                </div>
            </div>

            <div className="space-y-12">
                {posts.map((post: any, idx: number) => {
                    const info = (descriptions as any)[post.type] || { title: `Post ${idx + 1}`, desc: "" };
                    return (
                        <Card key={idx} ref={(el) => (postRefs.current[idx] = el)} className="bg-card/50 backdrop-blur-xl rounded-[2.5rem] border-white/5 overflow-hidden group/post relative">
                            {/* Accent Background */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />

                            <div className="p-8 space-y-8 relative">
                                {/* Header Info */}
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="w-full md:w-[280px] space-y-4 shrink-0">
                                        <div
                                            className="aspect-square rounded-[2rem] bg-white/5 border border-white/10 relative overflow-hidden group/cover cursor-pointer hover:border-primary/30 transition-all shadow-2xl"
                                            onClick={() => handleGeneratePostCover(idx)}
                                        >
                                            {post.thumbnail_url ? (
                                                <img src={post.thumbnail_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Capa" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                                                    <div className="p-4 bg-white/5 rounded-2xl">
                                                        <ImageIcon className="w-8 h-8" />
                                                    </div>
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Gerar Capa</span>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                {generatingCoverIdx === idx ? (
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                ) : (
                                                    <Wand2 className="w-8 h-8 text-white animate-pulse" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-primary/60 ml-1">Tema Principal</Label>
                                                <Input
                                                    className="h-12 rounded-2xl bg-white/5 border-white/5 focus:bg-white/10 transition-all font-black uppercase text-xs tracking-widest"
                                                    value={post.theme}
                                                    placeholder="EX: MUDANDO O JOGO"
                                                    onChange={(e) => {
                                                        const n = [...posts];
                                                        n[idx].theme = e.target.value;
                                                        setPosts(n);
                                                        markAsDirty();
                                                    }}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40 ml-1">Link Estratégico</Label>
                                                <div className="relative">
                                                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                                    <Input
                                                        className="h-11 pl-12 rounded-xl bg-white/5 border-white/5 focus:bg-white/10 transition-all text-[10px] font-mono"
                                                        value={post.link}
                                                        placeholder="https://link-do-post.com"
                                                        onChange={(e) => {
                                                            const n = [...posts];
                                                            n[idx].link = e.target.value;
                                                            setPosts(n);
                                                            markAsDirty();
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                                <h3 className="text-lg font-black tracking-tight">{info.title}</h3>
                                            </div>
                                            <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10">
                                                <p className="text-[11px] leading-relaxed text-primary/80 font-medium whitespace-pre-line">{info.desc}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 relative group/script">
                                            <div className="flex items-center justify-between ml-1">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40">Roteiro / Legenda IA</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/100 transition-all"
                                                    onClick={() => handleGeneratePostContent(idx)}
                                                    disabled={generatingContentIdx === idx}
                                                >
                                                    {generatingContentIdx === idx ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                                    {post.content ? "Gerar Nova Versão" : "Criar Roteiro"}
                                                </Button>
                                            </div>
                                            <Textarea
                                                className="min-h-[200px] rounded-[2rem] p-6 bg-white/[0.03] border-white/5 focus-visible:ring-primary/20 transition-all text-xs font-medium leading-relaxed resize-none no-scrollbar"
                                                value={post.content}
                                                placeholder="Aguardando geração da estratégia..."
                                                onChange={(e) => {
                                                    const n = [...posts];
                                                    n[idx].content = e.target.value;
                                                    setPosts(n);
                                                    markAsDirty();
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/5">
                                    <Button
                                        className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest gradient-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group/save"
                                        onClick={async () => {
                                            await updateSocialData.mutateAsync({ updates: { pinned_posts: posts } });
                                            toast.success("Post salvo com sucesso!");
                                        }}
                                    >
                                        <Save className="w-4 h-4 mr-2 group-hover/save:scale-110 transition-transform" /> Salvar Post
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest border-white/5 bg-white/5 hover:bg-white/10 transition-all group/export"
                                        onClick={() => handleExportPost(post)}
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2 text-green-500 group-export:scale-110 transition-transform" /> Exportar
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        className="h-14 w-14 rounded-2xl text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all group/clear"
                                        onClick={() => {
                                            const n = [...posts];
                                            n[idx] = { ...n[idx], theme: "", content: "", thumbnail_url: "", link: "" };
                                            setPosts(n);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 group-hover/clear:scale-110 transition-transform" />
                                    </Button>

                                    <div className="flex-1" />

                                    <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                                        <Brain className="w-3 h-3 text-primary/40" />
                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">IA Chat Sugestões</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Button
                className="w-full h-20 rounded-[2.5rem] text-lg font-black gradient-primary shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-4 mt-8"
                onClick={() => {
                    onSave({ pinned_posts: posts });
                    onBack();
                    toast.success("Estratégia completa salva!");
                }}
            >
                <div className="p-3 bg-white/20 rounded-2xl">
                    <Check className="w-6 h-6" />
                </div>
                <span>Concluir Estratégia de Posts</span>
            </Button>
        </div>
    );
}
