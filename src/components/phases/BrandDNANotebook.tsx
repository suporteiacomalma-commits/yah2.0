import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Save, Loader2, Wand2, FileText, CheckCircle2, Pencil, Plus, Trash2, Dna, FileDown, Rocket, Target, Sparkles } from "lucide-react";
import { useBrand, Brand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { supabase } from "@/integrations/supabase/client";

const OBJETIVO_OPTIONS = [
    "Criar minha marca do zero",
    "Melhorar minha presença online",
    "Reposicionar minha marca",
    "Escalar meu negócio",
];

export function BrandDNANotebook() {
    const { brand, updateBrand, completePhase } = useBrand();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const { getSetting } = useSystemSettings();

    // Local state for form data
    const [formData, setFormData] = useState<Partial<Brand>>({});
    const [outroObjetivo, setOutroObjetivo] = useState("");

    useEffect(() => {
        if (brand) {
            setFormData(brand);
            // If they already have a generated DNA, skip to results
            if (brand.dna_tese && step === 1) {
                setStep(3);
                return;
            }

            // Suggest niche and product if empty
            if (step === 1 && brand.result_essencia && (!brand.dna_nicho || !brand.dna_produto)) {
                handleSuggestDNAFields();
            }
        }
    }, [brand]);

    const handleSuggestDNAFields = async () => {
        if (isSuggesting || !brand?.result_essencia) return;
        setIsSuggesting(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) return;

            const prompt = `Com base nestas informações de personalidade:
Papel: ${brand.user_role}
Motivação: ${brand.user_motivation}
Mudança: ${brand.user_change_world}
Essência: ${brand.result_essencia}

Sugira um nicho específico (dna_nicho) e um produto/serviço (dna_produto) ideal para esta marca.
Retorne apenas um JSON: { "dna_nicho": "string", "dna_produto": "string" } em Português.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um estrategista de marca. Saída sempre em JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("Falha na sugestão");

            const aiData = await response.json();
            const results = JSON.parse(aiData.choices[0].message.content);

            if (results.dna_nicho && !formData.dna_nicho) {
                handleInputChange("dna_nicho", results.dna_nicho);
            }
            if (results.dna_produto && !formData.dna_produto) {
                handleInputChange("dna_produto", results.dna_produto);
            }
            toast.info("Sugestões da IA carregadas com base na sua personalidade!");
        } catch (error) {
            console.error("Suggestion error:", error);
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleInputChange = (field: keyof Brand, value: any) => {
        const updatedData = { ...formData, [field]: value };
        setFormData(updatedData);
        updateBrand.mutate({ [field]: value });
    };

    const handleObjetivoChange = (option: string) => {
        handleInputChange("dna_objetivo", option);
    };

    const handleGenerateDNA = async () => {
        setIsGenerating(true);
        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) {
                toast.error("OpenAI API Key não configurada.");
                setIsGenerating(false);
                return;
            }

            const prompt = `Você é um estrategista de marca experiente. Sua tarefa é cruzar as informações de personalidade do usuário com as informações de DNA fornecidas agora para gerar um posicionamento de marca completo.

DADOS DE PERSONALIDADE (JÁ PREENCHIDOS):
- Papel: ${brand?.user_role}
- Motivação: ${brand?.user_motivation}
- Mudança: ${brand?.user_change_world}
- Tons: ${brand?.user_tone_selected?.join(", ")}
- Essência: ${brand?.result_essencia}
- Tom de Voz: ${brand?.result_tom_voz}

NOVOS DADOS DE DNA:
- Nicho: ${formData.dna_nicho}
- Produto/Serviço: ${formData.dna_produto}
- Objetivo: ${formData.dna_objetivo}
- Dor Principal: ${formData.dna_dor_principal}
- Sonho Principal: ${formData.dna_sonho_principal}
- Transformação: ${formData.dna_transformacao}
- Diferencial: ${formData.dna_diferencial}

GERE UM JSON COM AS SEGUINTES CHAVES:
1. dna_tese: Uma frase-mãe poderosa (Ajudar [público] a [transformação] sem [barreira], usando [diferencial] com base na sua personalidade).
2. dna_pilares: Lista de 5 objetos { "title": "...", "description": "..." }.
3. mission, vision, values, purpose: Strings curtas e impactantes.
4. dna_objecao_comum: A barreira mais frequente do público.
5. persona_data: Objeto { "name": "...", "job": "...", "pains": ["...","...","..."], "objections": ["...","...","..."], "dream": "..." }.
6. dna_competidores: Lista de 3 objetos { "name": "...", "features": "...", "promise": "..." }.
7. dna_comparativo: Texto comparando o diferencial do usuário com o mercado.
8. dna_uvp: Proposta Única de Valor (frase curta).

SAÍDA APENAS EM JSON EM PORTUGUÊS.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um estrategista de marca especialista em branding 2.0. Saída sempre em JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("Falha na chamada da IA");

            const aiData = await response.json();
            const results = JSON.parse(aiData.choices[0].message.content);

            await updateBrand.mutateAsync({
                dna_tese: results.dna_tese,
                dna_pilares: results.dna_pilares,
                mission: results.mission,
                vision: results.vision,
                values: results.values,
                purpose: results.purpose,
                dna_objecao_comum: results.dna_objecao_comum,
                dna_persona_data: results.persona_data,
                dna_competidores: results.dna_competidores,
                dna_comparativo: results.dna_comparativo,
                dna_uvp: results.dna_uvp
            });

            setStep(3);
            toast.success("DNA da Marca gerado com sucesso!");
        } catch (error: any) {
            console.error("DNA Generation error:", error);
            toast.error("Erro ao gerar DNA: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const progressMap: Record<number, number> = {
        1: 50,
        2: 75,
        3: 100
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium text-muted-foreground mb-1">
                    <span>Progresso do DNA</span>
                    <span>{progressMap[step]}%</span>
                </div>
                <Progress value={progressMap[step]} className="h-2" />
            </div>

            {step === 1 && (
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">DNA DA MARCA — TELA 1</CardTitle>
                        <CardDescription className="text-lg">
                            “Agora que entendemos quem você é, vamos transformar sua essência em estratégia.”
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3 relative">
                            <div className="flex justify-between items-center">
                                <Label className="text-base font-semibold text-primary/80">1. Qual é o seu nicho específico?</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSuggestDNAFields}
                                    disabled={isSuggesting}
                                    className="text-[10px] h-6 px-2 text-accent flex items-center gap-1 hover:bg-accent/10"
                                >
                                    {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Sugerir com IA
                                </Button>
                            </div>
                            <Input
                                placeholder="Ex: Marketing para terapeutas"
                                value={formData.dna_nicho || ""}
                                onChange={(e) => handleInputChange("dna_nicho", e.target.value)}
                                className={cn(
                                    "bg-background/50 border-border h-12 transition-all",
                                    isSuggesting && !formData.dna_nicho && "animate-pulse border-accent/30"
                                )}
                            />
                        </div>
                        <div className="space-y-3 relative">
                            <div className="flex justify-between items-center">
                                <Label className="text-base font-semibold text-primary/80">2. Qual é o produto/serviço que você quer posicionar?</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSuggestDNAFields}
                                    disabled={isSuggesting}
                                    className="text-[10px] h-6 px-2 text-accent flex items-center gap-1 hover:bg-accent/10"
                                >
                                    {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Sugerir com IA
                                </Button>
                            </div>
                            <Input
                                placeholder="Cursos online, produtos digitais, serviço de design, consultoria…"
                                value={formData.dna_produto || ""}
                                onChange={(e) => handleInputChange("dna_produto", e.target.value)}
                                className={cn(
                                    "bg-background/50 border-border h-12 transition-all",
                                    isSuggesting && !formData.dna_produto && "animate-pulse border-accent/30"
                                )}
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-base font-semibold text-primary/80">3. Qual é o objetivo principal com sua marca?</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {OBJETIVO_OPTIONS.map((opt) => (
                                    <div
                                        key={opt}
                                        onClick={() => handleObjetivoChange(opt)}
                                        className={cn(
                                            "flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                                            formData.dna_objetivo === opt ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <Checkbox checked={formData.dna_objetivo === opt} />
                                        <span className="font-medium">{opt}</span>
                                    </div>
                                ))}
                                <div className="md:col-span-2 space-y-2">
                                    <div
                                        onClick={() => handleObjetivoChange(outroObjetivo || "Outro")}
                                        className={cn(
                                            "flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                                            formData.dna_objetivo && !OBJETIVO_OPTIONS.includes(formData.dna_objetivo) ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <Checkbox checked={formData.dna_objetivo && !OBJETIVO_OPTIONS.includes(formData.dna_objetivo!)} />
                                        <span className="font-medium">Outro</span>
                                    </div>
                                    {formData.dna_objetivo && !OBJETIVO_OPTIONS.includes(formData.dna_objetivo) && (
                                        <Input
                                            placeholder="Especifique seu objetivo..."
                                            value={outroObjetivo || (formData.dna_objetivo !== "Outro" ? formData.dna_objetivo : "")}
                                            onChange={(e) => {
                                                setOutroObjetivo(e.target.value);
                                                handleInputChange("dna_objetivo", e.target.value);
                                            }}
                                            className="bg-background/50"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 gap-4">
                            <Button variant="ghost" onClick={() => navigate("/dashboard")}>Voltar ao Início</Button>
                            <Button onClick={() => setStep(2)} className="gradient-primary text-white px-8 h-12">
                                Próximo <ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">DNA DA MARCA — TELA 2</CardTitle>
                        <CardDescription className="text-lg">
                            “Para quem você quer falar? Seja específico(a). Isso é crucial para a IA criar conteúdo que conecta.”
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-base font-semibold text-primary/80">4. Descreva a dor principal do seu público.</Label>
                            <Input
                                placeholder="Ex: Não consigo me organizar para criar conteúdo"
                                value={formData.dna_dor_principal || ""}
                                onChange={(e) => handleInputChange("dna_dor_principal", e.target.value)}
                                className="bg-background/50 border-border h-12"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-base font-semibold text-primary/80">5. Qual sonho seu público tem?</Label>
                            <Input
                                placeholder="Ser reconhecida como autoridade na minha área"
                                value={formData.dna_sonho_principal || ""}
                                onChange={(e) => handleInputChange("dna_sonho_principal", e.target.value)}
                                className="bg-background/50 border-border h-12"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-base font-semibold text-primary/80">6. Qual transformação sua marca entrega (Antes → Depois)?</Label>
                            <Input
                                placeholder="Ex: De desorganizado para produtivo. Mesmo que confuso, a IA organiza."
                                value={formData.dna_transformacao || ""}
                                onChange={(e) => handleInputChange("dna_transformacao", e.target.value)}
                                className="bg-background/50 border-border h-12"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-base font-semibold text-primary/80">7. O que te torna diferente?</Label>
                            <Input
                                placeholder="Sua história, vivência, metodologia, abordagem própria…"
                                value={formData.dna_diferencial || ""}
                                onChange={(e) => handleInputChange("dna_diferencial", e.target.value)}
                                className="bg-background/50 border-border h-12"
                            />
                        </div>
                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep(1)} className="h-12">
                                <ChevronLeft className="mr-2 w-4 h-4" /> Voltar
                            </Button>
                            <Button
                                onClick={handleGenerateDNA}
                                disabled={isGenerating}
                                className="gradient-primary text-white px-10 h-12 text-lg font-bold shadow-lg"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 animate-spin w-5 h-5" />
                                        Gerando DNA...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="mr-2 w-5 h-5" />
                                        Gerar DNA da Marca
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
                    <div className="text-center space-y-4 py-6">
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-2">
                            <Dna className="w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-extrabold text-foreground">DNA da Sua Marca</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Sua essência transformada em estratégia pura. Tudo aqui alimenta o cérebro da sua marca.
                        </p>
                    </div>

                    {/* SEÇÃO 1 — TESE CENTRAL */}
                    <ResultSection
                        title="🎯 SEÇÃO 1 — TESE CENTRAL"
                        description="Esta é a frase-mãe que guiará todo o seu conteúdo."
                        content={formData.dna_tese || ""}
                        onSave={(val) => handleInputChange("dna_tese", val)}
                    />

                    {/* SEÇÃO 2 — ASSUNTOS GERADOS PELA IA */}
                    <Card className="bg-card border-border overflow-hidden p-6 space-y-6">
                        <div className="space-y-2">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-accent" />
                                🎯 SEÇÃO 2 — ASSUNTOS GERADOS PELA IA
                            </CardTitle>
                            <p className="text-muted-foreground text-sm font-medium">
                                Esses são os temas sobre os quais sua marca sempre vai falar. A YAh analisou sua personalidade e organizou os pilares principais.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(formData.dna_pilares as any[] || []).map((pilar, idx) => (
                                <PilarItem
                                    key={idx}
                                    index={idx}
                                    title={pilar.title}
                                    description={pilar.description}
                                    onEdit={(title, desc) => {
                                        const newPilares = [...(formData.dna_pilares as any[])];
                                        newPilares[idx] = { title, description: desc };
                                        handleInputChange("dna_pilares", newPilares);
                                    }}
                                    onDelete={() => {
                                        const newPilares = (formData.dna_pilares as any[]).filter((_, i) => i !== idx);
                                        handleInputChange("dna_pilares", newPilares);
                                    }}
                                />
                            ))}
                        </div>

                        {(formData.dna_pilares as any[] || []).length < 7 && (
                            <Button
                                variant="outline"
                                className="w-full border-dashed"
                                onClick={() => {
                                    const newPilares = [...(formData.dna_pilares as any[] || []), { title: "Novo Assunto", description: "Descrição do assunto..." }];
                                    handleInputChange("dna_pilares", newPilares);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Adicionar Assunto
                            </Button>
                        )}
                    </Card>

                    {/* SEÇÃO 3 — POSICIONAMENTO COMPLETO */}
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold">🎯 SEÇÃO 3 — POSICIONAMENTO COMPLETO</h3>
                            <p className="text-muted-foreground">A IA gerou seu posicionamento estratégico completo.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ResultSection title="Missão" content={formData.mission || ""} onSave={(v) => handleInputChange("mission", v)} />
                            <ResultSection title="Visão" content={formData.vision || ""} onSave={(v) => handleInputChange("vision", v)} />
                            <ResultSection title="Valores" content={formData.values || ""} onSave={(v) => handleInputChange("values", v)} />
                            <ResultSection title="Propósito" content={formData.purpose || ""} onSave={(v) => handleInputChange("purpose", v)} />
                            <ResultSection title="Nicho" content={formData.dna_nicho || ""} onSave={(v) => handleInputChange("dna_nicho", v)} />
                            <ResultSection title="Dor Principal" content={formData.dna_dor_principal || ""} onSave={(v) => handleInputChange("dna_dor_principal", v)} />
                            <ResultSection title="Sonho Principal" content={formData.dna_sonho_principal || ""} onSave={(v) => handleInputChange("dna_sonho_principal", v)} />
                            <ResultSection title="Objeção Comum" content={formData.dna_objecao_comum || ""} onSave={(v) => handleInputChange("dna_objecao_comum", v)} />
                            <ResultSection title="UVP (Proposta Única de Valor)" content={formData.dna_uvp || ""} onSave={(v) => handleInputChange("dna_uvp", v)} />
                            <ResultSection title="Diferencial" content={formData.dna_diferencial || ""} onSave={(v) => handleInputChange("dna_diferencial", v)} />
                        </div>

                        <Card className="p-6 md:p-8 space-y-6 border-2 border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary rounded-lg text-white">
                                    <Target className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold italic">Persona Completa</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-primary font-bold">Nome Simbólico</Label>
                                        <Input
                                            value={(formData.dna_persona_data as any)?.name || ""}
                                            onChange={(e) => {
                                                const p = { ...(formData.dna_persona_data as any), name: e.target.value };
                                                handleInputChange("dna_persona_data", p);
                                            }}
                                            className="bg-background"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-primary font-bold">Profissão/Momento</Label>
                                        <Input
                                            value={(formData.dna_persona_data as any)?.job || ""}
                                            onChange={(e) => {
                                                const p = { ...(formData.dna_persona_data as any), job: e.target.value };
                                                handleInputChange("dna_persona_data", p);
                                            }}
                                            className="bg-background"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-primary font-bold">Sonho Principal</Label>
                                        <Textarea
                                            value={(formData.dna_persona_data as any)?.dream || ""}
                                            onChange={(e) => {
                                                const p = { ...(formData.dna_persona_data as any), dream: e.target.value };
                                                handleInputChange("dna_persona_data", p);
                                            }}
                                            className="bg-background h-20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-primary font-bold">3 Dores Principais (uma por linha)</Label>
                                        <Textarea
                                            value={(formData.dna_persona_data as any)?.pains?.join("\n") || ""}
                                            onChange={(e) => {
                                                const p = { ...(formData.dna_persona_data as any), pains: e.target.value.split("\n") };
                                                handleInputChange("dna_persona_data", p);
                                            }}
                                            className="bg-background h-24"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-primary font-bold">3 Objeções (uma por linha)</Label>
                                        <Textarea
                                            value={(formData.dna_persona_data as any)?.objections?.join("\n") || ""}
                                            onChange={(e) => {
                                                const p = { ...(formData.dna_persona_data as any), objections: e.target.value.split("\n") };
                                                handleInputChange("dna_persona_data", p);
                                            }}
                                            className="bg-background h-24"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <ResultSection title="Comparativo de Mercado" content={formData.dna_comparativo || ""} onSave={(v) => handleInputChange("dna_comparativo", v)} fullWidth />
                    </div>

                    <div className="flex flex-col items-center gap-6 pt-12 pb-12">
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button variant="outline" className="px-6 h-12" onClick={() => window.print()}>
                                <FileDown className="mr-2 w-4 h-4" /> Exportar DNA Completo (PDF)
                            </Button>
                            <Button variant="outline" className="px-6 h-12">
                                <Plus className="mr-2 w-4 h-4" /> Adicionar Complementos
                            </Button>
                        </div>

                        <div className="w-full mt-12 p-10 rounded-[3rem] bg-gradient-to-br from-primary/30 via-primary/5 to-card border border-primary/20 text-center space-y-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Rocket className="w-32 h-32" />
                            </div>
                            <h3 className="text-3xl font-black">Pronto! Seu DNA está completo.</h3>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                                Agora que sua estratégia está desenhada, vamos estruturar sua rotina semanal e colocar tudo em movimento?
                            </p>
                            <Button
                                onClick={() => {
                                    completePhase.mutate(2, {
                                        onSuccess: () => navigate("/phase/6")
                                    });
                                }}
                                className="gradient-primary text-white h-16 px-16 text-2xl font-black rounded-full shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                            >
                                Estruturar Minha Rotina 📅
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ResultSection({ title, description, content, onSave, fullWidth }: { title: string; description?: string; content: string; onSave: (val: string) => void; fullWidth?: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(content);

    useEffect(() => setValue(content), [content]);

    return (
        <Card className={cn("bg-card border-border overflow-hidden", fullWidth && "md:col-span-2")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg font-bold">{title}</CardTitle>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? "Cancelar" : <Pencil className="w-4 h-4" />}
                </Button>
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <div className="space-y-3">
                        <Textarea value={value} onChange={(e) => setValue(e.target.value)} className="min-h-[100px]" />
                        <Button size="sm" onClick={() => { onSave(value); setIsEditing(false); }} className="w-full">Salvar</Button>
                    </div>
                ) : (
                    <div className="p-3 rounded-lg bg-background/50 border text-sm leading-relaxed">
                        {content || "Gere o DNA para ver este resultado..."}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function PilarItem({ title, description, onEdit, onDelete, index }: { title: string; description: string; onEdit: (t: string, d: string) => void; onDelete: () => void; index: number }) {
    const [isEditing, setIsEditing] = useState(false);
    const [t, setT] = useState(title);
    const [d, setD] = useState(description);

    return (
        <div className="p-4 rounded-2xl bg-background/40 border border-primary/10 space-y-2 relative group">
            <div className="flex items-start justify-between">
                <div>
                    <span className="text-[10px] uppercase tracking-tighter text-primary font-black opacity-50">Assunto {index + 1}</span>
                    {isEditing ? (
                        <Input value={t} onChange={(e) => setT(e.target.value)} className="h-8 mt-1" />
                    ) : (
                        <h4 className="font-bold text-base">{title}</h4>
                    )}
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditing(!isEditing)}>
                        <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={onDelete}>
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>
            {isEditing ? (
                <div className="space-y-2">
                    <Textarea value={d} onChange={(e) => setD(e.target.value)} className="text-xs min-h-[60px]" />
                    <Button size="sm" className="w-full h-7 text-xs" onClick={() => { onEdit(t, d); setIsEditing(false); }}>OK</Button>
                </div>
            ) : (
                <p className="text-xs text-muted-foreground leading-snug">{description}</p>
            )}
        </div>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            height="24"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            <path d="M19 3v4" />
            <path d="M21 5h-4" />
        </svg>
    );
}
