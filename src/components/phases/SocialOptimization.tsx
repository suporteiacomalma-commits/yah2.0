import React, { useState, useEffect, useRef } from "react";
import {
    Camera, Plus, Pencil, Save, Upload, Link,
    Loader2, Sparkles, ChevronRight, ArrowLeft,
    Instagram, MessageSquare, Image as ImageIcon,
    MoreHorizontal, Grid, Film, UserSquare,
    TrendingUp, Compass, PlayCircle, History,
    Trash2, Wand2, Brain, Check, ChevronDown, Menu
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
    const profilePhotoInputRef = useRef<HTMLInputElement>(null);

    // Initialize local data when socialData loads
    useEffect(() => {
        if (socialData) {
            setLocalData(socialData);
            if (socialData.diagnosis || socialData.print_url || socialData.bio || socialData.name) {
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
                    { content: "", thumbnail_url: "", logic: "Post 1 — Dor e Promessa: validar a dor real, explicar por que essa dor existe, apresentar promessa específica.", type: "pain" },
                    { content: "", thumbnail_url: "", logic: "Post 2 — Processo/Ferramenta: mostrar como o método funciona e demonstrar o mecanismo antes → depois.", type: "process" },
                    { content: "", thumbnail_url: "", logic: "Post 3 — Transformação + CTA: apresentar resultado concreto, prova e CTA direto.", type: "transformation" }
                ]
            });
        }
    }, [socialData]);

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
        <div className="w-full max-w-4xl mx-auto min-h-[600px] flex flex-col">
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
                                            <div key={idx} className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0" onClick={() => setStep("tela3b")}>
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
                                        <div className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0">
                                            <div className="w-[66px] h-[66px] rounded-full border border-primary/20 p-0.5 bg-primary/5 flex items-center justify-center">
                                                <Sparkles className="w-6 h-6 text-primary" />
                                            </div>
                                            <span className="text-[10px] font-medium text-primary text-center">+ IA</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0">
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
                                            <div key={idx} className="aspect-square relative group cursor-pointer bg-slate-100 overflow-hidden" onClick={() => setStep("tela3c")}>
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
                <Screen3A data={localData} onBack={() => setStep("tela2")} onSave={(updates) => setLocalData({ ...localData, ...updates })} />
            )}

            {/* Screen 3B: Highlights Edit */}
            {step === "tela3b" && (
                <Screen3B data={localData} onBack={() => setStep("tela2")} onSave={(updates) => setLocalData({ ...localData, ...updates })} />
            )}

            {/* Screen 3C: Pinned Posts Edit */}
            {step === "tela3c" && (
                <Screen3C data={localData} onBack={() => setStep("tela2")} onSave={(updates) => setLocalData({ ...localData, ...updates })} />
            )}
        </div>
    );
}

// SUB-COMPONENTS FOR STEP 3A/B/C
function Screen3A({ data, onBack, onSave }: { data: any, onBack: () => void, onSave: (updates: any) => void }) {
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

function Screen3B({ data, onBack, onSave }: { data: any, onBack: () => void, onSave: (updates: any) => void }) {
    const { getSetting } = useSystemSettings();
    const [highlights, setHighlights] = useState(data.highlights || []);
    const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
    const [insightGeneratingIdx, setInsightGeneratingIdx] = useState<number | null>(null);
    const [contentGeneratingIdx, setContentGeneratingIdx] = useState<number | null>(null);

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
                    prompt: `Premium 3D high-fidelity porcelain icon for Instagram highlight. Subject: ${promptText}. Style: futuristic Glassmorphism, ultra-elegant textures, clean luxury branding style, solid soft-gradient background, high-end professional graphic design, 8k resolution, cinematic lighting, no human faces.`,
                    n: 1,
                    size: "1024x1024"
                })
            });
            const res = await response.json();

            if (res.error) throw new Error(res.error.message);

            const newHighlights = [...highlights];
            newHighlights[idx].cover_url = res.data[0].url;
            setHighlights(newHighlights);
            toast.success("Ícone gerado com sucesso!");
        } catch (e: any) {
            toast.error("Erro ao gerar ícone: " + e.message);
        } finally {
            setGeneratingIdx(null);
        }
    };

    const handleGenerateInsights = async (idx: number, title: string) => {
        if (!title) {
            toast.error("Por favor, defina um título para o destaque primeiro");
            return;
        }
        setInsightGeneratingIdx(idx);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um estrategista de marca e especialista em Instagram. Sua tarefa é criar insights estratégicos e curtos sobre o que postar em um destaque específico." },
                        { role: "user", content: `Gere 3 tópicos curtos e poderosos sobre o que postar no destaque intitulado "${title}" para uma marca premium. Foco em autoridade e conexão.` }
                    ]
                })
            });
            const res = await response.json();

            if (res.error) throw new Error(res.error.message);

            const content = res.choices[0].message.content;
            const newHighlights = [...highlights];
            newHighlights[idx].description = content;
            setHighlights(newHighlights);
            toast.success("Insights estratégicos gerados!");
        } catch (e: any) {
            toast.error("Erro ao gerar insights: " + e.message);
        } finally {
            setInsightGeneratingIdx(null);
        }
    };

    const handleGenerateContent = async (idx: number, title: string, insights: string) => {
        if (!insights) {
            toast.error("Por favor, gere os insights primeiro");
            return;
        }
        setContentGeneratingIdx(idx);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um roteirista de mídias sociais e estrategista de branding. Sua tarefa é transformar insights de destaques do Instagram em roteiros detalhados e prontos para gravar/postar." },
                        { role: "user", content: `Com base nos seguintes insights para o destaque "${title}":\n\n${insights}\n\nCrie um roteiro detalhado com sugestões de 3 a 5 stories. \n\nIMPORTANTE: Use exatamente o marcador [STORY] antes de começar cada story. \nCada story deve ter um Título curto, Descrição Visual e Texto/Fala.\n\nExemplo de formato:\n[STORY]\n**Story 1: Titulo**\nVisual: ...\nTexto: ...\n\nMantenha o tom premium e focado em conversão.` }
                    ]
                })
            });
            const res = await response.json();

            if (res.error) throw new Error(res.error.message);

            const contentResult = res.choices[0].message.content;
            const newHighlights = [...highlights];
            newHighlights[idx].content = contentResult;
            setHighlights(newHighlights);
            toast.success("Conteúdo detalhado gerado com sucesso!");
        } catch (e: any) {
            toast.error("Erro ao gerar conteúdo: " + e.message);
        } finally {
            setContentGeneratingIdx(null);
        }
    };

    const handleShareWhatsApp = (h: any) => {
        const text = `*Estratégia de Destaque: ${h.title}*\n\n*Insights:*\n${h.description}\n\n*Roteiro Detalhado:*\n${h.content?.replace(/\[STORY\]/g, '\n---\n')}`;
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    return (
        <div className="flex-1 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
                    <h2 className="text-2xl font-black">Estratégia dos Destaques</h2>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => setHighlights([...highlights, { title: "Novo", description: "", cover_url: "", type: "custom" }])}>
                    <Plus className="w-4 h-4" /> Novo Destaque
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {highlights.map((h: any, idx: number) => (
                    <Card key={idx} className="bg-card rounded-3xl overflow-hidden border-border group hover:border-primary/50 transition-all">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-center">
                                <div className="relative group">
                                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border relative">
                                        {generatingIdx === idx ? (
                                            <div className="absolute inset-0 bg-primary/10 flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                                <span className="text-[6px] font-black uppercase tracking-tighter text-primary animate-pulse">Criando...</span>
                                            </div>
                                        ) : h.cover_url ? (
                                            <img src={h.cover_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 opacity-20" />
                                        )}
                                    </div>
                                    <Button
                                        size="icon"
                                        className={cn(
                                            "absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-lg transition-all",
                                            generatingIdx === idx ? "bg-primary opacity-50 cursor-not-allowed" : "gradient-primary"
                                        )}
                                        onClick={() => handleGenerateImage(idx, h.title)}
                                        disabled={generatingIdx !== null}
                                    >
                                        {generatingIdx === idx ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Wand2 className="w-4 h-4 text-white" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Input
                                    className="font-black text-center uppercase tracking-widest text-xs h-10 rounded-xl"
                                    value={h.title}
                                    onChange={(e) => {
                                        const n = [...highlights];
                                        n[idx].title = e.target.value;
                                        setHighlights(n);
                                    }}
                                />
                                <div className="p-3 rounded-2xl bg-secondary/20 text-[10px] font-bold uppercase tracking-wider text-primary text-center">
                                    {h.type}
                                </div>
                                <div className="space-y-2 relative">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground/40 ml-1">Estratégia de Conteúdo</Label>
                                    <Textarea
                                        className="text-xs font-medium leading-relaxed min-h-[120px] rounded-2xl bg-secondary/5 border-white/5 focus-visible:ring-primary/20 transition-all no-scrollbar"
                                        placeholder="O que postar aqui..."
                                        value={h.description}
                                        onChange={(e) => {
                                            const n = [...highlights];
                                            n[idx].description = e.target.value;
                                            setHighlights(n);
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full mt-2 rounded-xl text-[10px] uppercase font-black tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all group"
                                        onClick={() => handleGenerateInsights(idx, h.title)}
                                        disabled={insightGeneratingIdx !== null}
                                    >
                                        {insightGeneratingIdx === idx ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                                        )}
                                        {insightGeneratingIdx === idx ? "Analisando..." : "Gerar Insights IA"}
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full mt-1 border-primary/20 rounded-xl text-[10px] uppercase font-black tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all group"
                                        onClick={() => handleGenerateContent(idx, h.title, h.description)}
                                        disabled={contentGeneratingIdx !== null || !h.description}
                                    >
                                        {contentGeneratingIdx === idx ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <TrendingUp className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                        )}
                                        {contentGeneratingIdx === idx ? "Roteirizando..." : "Gerar Conteúdo Detalhado"}
                                    </Button>

                                    {h.content && (
                                        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                            <div className="flex items-center justify-between ml-1">
                                                <Label className="text-[10px] uppercase font-bold text-primary/60">Roteiro dos Stories</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[8px] uppercase font-black gap-1.5 text-green-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg"
                                                    onClick={() => handleShareWhatsApp(h)}
                                                >
                                                    <MessageSquare className="w-3 h-3" /> WhatsApp
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                {h.content.split('[STORY]').filter(Boolean).map((story: string, sIdx: number) => (
                                                    <div key={sIdx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 relative group/story">
                                                        <div className="absolute -left-2 top-4 w-1 h-8 bg-primary rounded-full opacity-0 group-hover/story:opacity-100 transition-opacity" />
                                                        <Textarea
                                                            className="text-[11px] font-medium leading-relaxed min-h-[100px] bg-transparent border-none p-0 focus-visible:ring-0 resize-none no-scrollbar"
                                                            value={story.trim()}
                                                            onChange={(e) => {
                                                                const n = [...highlights];
                                                                const stories = h.content.split('[STORY]');
                                                                stories[sIdx + 1] = e.target.value; // +1 because split filter(Boolean) might shift if first is empty
                                                                // Actually, let's be safer with the update logic
                                                                const rawStories = h.content.split('[STORY]');
                                                                // Find the index in rawStories
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
                                                                n[idx].content = rawStories.join('[STORY]');
                                                                setHighlights(n);
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            <Button
                className="w-full h-20 rounded-3xl text-lg font-black gradient-primary shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3"
                onClick={() => { onSave({ highlights }); onBack(); toast.success("Estratégia salva!"); }}
            >
                <Save className="w-6 h-6" />
                Salvar Estratégia dos Destaques
            </Button>
        </div>
    );
}

function Screen3C({ data, onBack, onSave }: { data: any, onBack: () => void, onSave: (updates: any) => void }) {
    const { getSetting } = useSystemSettings();
    const [posts, setPosts] = useState(data.pinned_posts || []);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGeneratePost = async (idx: number) => {
        setIsGenerating(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            // 1. Text content
            const textResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: `Gere um mini-roteiro para um post fixado do tipo ${posts[idx].type}. Lógica: ${posts[idx].logic}.` }]
                })
            });
            const textData = await textResponse.json();
            const content = textData.choices[0].message.content;

            // 2. Image
            const imgResponse = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    prompt: `Premium aesthetic instagram post cover for ${posts[idx].type}. Realistic, professional lighting, elegant textures, no faces. Style: ${data.diagnosis || 'Minimalist'}.`,
                    n: 1,
                    size: "1024x1024"
                })
            });
            const imgData = await imgResponse.json();

            const newPosts = [...posts];
            newPosts[idx].content = content;
            newPosts[idx].thumbnail_url = imgData.data[0].url;
            setPosts(newPosts);
        } catch (e) {
            toast.error("Erro na geração");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex-1 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
                <h2 className="text-2xl font-black">Estratégia dos Posts Fixados</h2>
            </div>

            <div className="space-y-6">
                {posts.map((post: any, idx: number) => (
                    <Card key={idx} className="bg-card rounded-[32px] overflow-hidden border-border group">
                        <div className="flex flex-col md:flex-row gap-6 p-6">
                            <div className="w-full md:w-1/3 aspect-square rounded-2xl bg-secondary relative overflow-hidden shrink-0">
                                {post.thumbnail_url ? <img src={post.thumbnail_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><Sparkles className="w-12 h-12" /></div>}
                                <Button className="absolute bottom-4 right-4 h-12 w-12 rounded-xl shadow-2xl" onClick={() => handleGeneratePost(idx)} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />}
                                </Button>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Post {idx + 1} — {post.type?.toUpperCase()}</span>
                                    <p className="text-xs text-muted-foreground font-medium italic">{post.logic}</p>
                                </div>
                                <Textarea
                                    className="min-h-[150px] rounded-2xl p-4 bg-background/50 border-none focus:ring-1 focus:ring-primary/20"
                                    value={post.content}
                                    onChange={(e) => {
                                        const n = [...posts];
                                        n[idx].content = e.target.value;
                                        setPosts(n);
                                    }}
                                    placeholder="Roteiro ou legenda estratégica..."
                                />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            <Button className="w-full h-14 rounded-2xl" onClick={() => { onSave({ pinned_posts: posts }); onBack(); }}>Salvar Posts Fixados</Button>
        </div>
    );
}
