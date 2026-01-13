import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Save, Loader2, Wand2, FileText, CheckCircle2, Pencil } from "lucide-react";
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

const TONE_OPTIONS = [
    "Leve e descontraído(a)",
    "Sério(a) e profissional",
    "Direto(a) e objetivo(a)",
    "Analítico(a) e profundo(a)",
    "Informal e amigável",
    "Estruturado(a) e didático(a)",
];

const CREATIVE_OPTIONS = [
    "Preciso de clareza antes de começar",
    "Crio melhor com exemplos",
    "Gosto de enviar áudio",
    "Sou rápido(a) para começar (impulsivo)",
    "Preciso de empurrão para começar",
    "Tenho hiperfoco",
    "Faço mil coisas ao mesmo tempo",
    "Preciso de lembretes constantes",
];

const ENERGY_OPTIONS = ["Manhã", "Tarde", "Noite", "Varia"];

export function PersonalityNotebook() {
    const { brand, updateBrand, completePhase } = useBrand();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const { getSetting } = useSystemSettings();

    // Local state for auto-save and UI responsiveness
    const [formData, setFormData] = useState<Partial<Brand>>({});

    useEffect(() => {
        if (brand) {
            setFormData(brand);
            // Skip to results if they already exist
            if (brand.result_essencia && step === 1) {
                setStep(4);
            }
        }
    }, [brand]);

    const handleInputChange = (field: keyof Brand, value: any) => {
        const updatedData = { ...formData, [field]: value };
        setFormData(updatedData);

        // Auto-save logic
        updateBrand.mutate({ [field]: value });
    };

    const toggleArrayOption = (field: keyof Brand, option: string, maxSelection?: number) => {
        const currentArray = (formData[field] as string[]) || [];
        let newArray: string[];

        if (currentArray.includes(option)) {
            newArray = currentArray.filter((i) => i !== option);
        } else {
            if (maxSelection && currentArray.length >= maxSelection) {
                toast.warning(`Você pode selecionar no máximo ${maxSelection} opções.`);
                return;
            }
            newArray = [...currentArray, option];
        }

        handleInputChange(field, newArray);
    };

    const handleGeneratePersonality = async () => {
        setIsGenerating(true);

        try {
            const apiKey = getSetting("openai_api_key")?.value;
            if (!apiKey) {
                toast.error("OpenAI API Key não configurada. Fale com um administrador.");
                setIsGenerating(false);
                return;
            }

            // Mock delay for simulation as requested (1-2s)
            await new Promise(resolve => setTimeout(resolve, 2000));

            const prompt = `Com base nestas informações, gere um perfil de personalidade estratégico:
        Profissão/Papel: ${formData.user_role}
        Motivação: ${formData.user_motivation}
        Mudança que quer gerar: ${formData.user_change_world}
        Tom de voz selecionado: ${formData.user_tone_selected?.join(", ")}
        Perfil criativo: ${formData.user_creative_profile?.join(", ")}
        Horários de energia: ${formData.user_energy_times?.join(", ")}
        Trava/Cansaço: ${formData.user_blockers}

        Gere 3 conteúdos em Português:
        1. Result Essencia: Uma descrição comportamental profunda. Modelo: "Você é uma pessoa [descrição], movida por [motivação] e orientada a gerar [impacto]. Seu modo de se colocar no mundo combina [tons]."
        2. Result Tom de Voz: Lista de adjetivos + uma frase exemplo.
        3. Result Como Funciona: Perfil criativo, melhores momentos e pontos de travamento.`;

            // In a real implementation, we would call an Edge Function or direct API here.
            // For now, I'll simulate the AI result or call a placeholder check.

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "Você é um estrategista de marca e psicólogo comportamental. Sua saída deve ser JSON com as chaves: result_essencia, result_tom_voz, result_como_funciona."
                        },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            const aiData = await response.json();
            const results = JSON.parse(aiData.choices[0].message.content);

            await updateBrand.mutateAsync({
                result_essencia: results.result_essencia,
                result_tom_voz: results.result_tom_voz,
                result_como_funciona: results.result_como_funciona
            });

            setStep(4);
            toast.success("Personalidade gerada com sucesso!");
        } catch (error: any) {
            console.error("AI Generation error:", error);
            toast.error("Erro ao gerar personalidade: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const progressMap: Record<number, number> = {
        1: 20,
        2: 50,
        3: 75,
        4: 100
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium text-muted-foreground mb-1">
                    <span>Progresso da Fase</span>
                    <span>{progressMap[step]}%</span>
                </div>
                <Progress value={progressMap[step]} className="h-2" />
            </div>

            {step === 1 && (
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">TELA 1 — BLOCO 1: QUEM É VOCÊ?</CardTitle>
                        <CardDescription className="text-lg">
                            “Vamos entender quem você é. Vamos situar a IA na sua vida real.”
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-base">1. O que você faz hoje (ou pretende fazer)?</Label>
                            <Input
                                placeholder="Ex: Sou designer freelancer, estou criando um app, sou consultora de marca…"
                                value={formData.user_role || ""}
                                onChange={(e) => handleInputChange("user_role", e.target.value)}
                                className="bg-background/50 border-border h-12"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-base">2. O que te move a fazer isso?</Label>
                            <Input
                                placeholder="Propósito, inquietação, liberdade… não precisa ser perfeito."
                                value={formData.user_motivation || ""}
                                onChange={(e) => handleInputChange("user_motivation", e.target.value)}
                                className="bg-background/50 border-border h-12"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-base">3. Qual mudança você quer gerar no mundo?</Label>
                            <Input
                                placeholder="Pense no impacto. Ex: Ajudar pessoas a se organizarem sem culpa."
                                value={formData.user_change_world || ""}
                                onChange={(e) => handleInputChange("user_change_world", e.target.value)}
                                className="bg-background/50 border-border h-12"
                            />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={() => setStep(2)} className="gradient-primary text-white px-8">
                                Próximo <ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">TELA 2 — BLOCO 2: COMO VOCÊ SE EXPRESSA</CardTitle>
                        <CardDescription className="text-lg">
                            “Agora, como você se comunica naturalmente?”
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-base block mb-4">4. Como você gosta de falar? (Selecione até 2)</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {TONE_OPTIONS.map((option) => (
                                    <div
                                        key={option}
                                        onClick={() => toggleArrayOption("user_tone_selected", option, 2)}
                                        className={cn(
                                            "flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                                            (formData.user_tone_selected || []).includes(option)
                                                ? "border-primary bg-primary/10"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <Checkbox
                                            checked={(formData.user_tone_selected || []).includes(option)}
                                            className="rounded-full"
                                        />
                                        <span className="font-medium">{option}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep(1)}>
                                <ChevronLeft className="mr-2 w-4 h-4" /> Voltar
                            </Button>
                            <Button onClick={() => setStep(3)} className="gradient-primary text-white px-8">
                                Próximo <ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 3 && (
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">TELA 3 — BLOCO 3: COMO VOCÊ FUNCIONA</CardTitle>
                        <CardDescription className="text-lg">
                            “Última etapa! Como você trabalha melhor?”
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-base block">5. Como você funciona criativamente?</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {CREATIVE_OPTIONS.map((option) => (
                                    <div
                                        key={option}
                                        onClick={() => toggleArrayOption("user_creative_profile", option)}
                                        className={cn(
                                            "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                                            (formData.user_creative_profile || []).includes(option)
                                                ? "border-primary bg-primary/5"
                                                : "border-border"
                                        )}
                                    >
                                        <Checkbox checked={(formData.user_creative_profile || []).includes(option)} />
                                        <span className="text-sm">{option}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-base block">6. Quando você tem mais energia?</Label>
                            <div className="flex flex-wrap gap-3">
                                {ENERGY_OPTIONS.map((option) => (
                                    <Button
                                        key={option}
                                        variant={formData.user_energy_times?.includes(option) ? "default" : "outline"}
                                        onClick={() => toggleArrayOption("user_energy_times", option)}
                                        className="rounded-full"
                                    >
                                        {option}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base">7. O que te trava ou te cansa?</Label>
                            <Textarea
                                placeholder="Ex: Começar do zero, decisões demais, fazer tudo sozinha."
                                value={formData.user_blockers || ""}
                                onChange={(e) => handleInputChange("user_blockers", e.target.value)}
                                className="bg-background/50 border-border min-h-[100px]"
                            />
                        </div>

                        <div className="flex justify-between pt-6">
                            <Button variant="outline" onClick={() => setStep(2)}>
                                <ChevronLeft className="mr-2 w-4 h-4" /> Voltar
                            </Button>
                            <Button
                                onClick={handleGeneratePersonality}
                                disabled={isGenerating}
                                className="gradient-primary text-white px-10 h-12 text-lg shadow-lg shadow-primary/20"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 animate-spin w-5 h-5" />
                                        Tecendo sua personalidade...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="mr-2 w-5 h-5" />
                                        Gerar Minha Personalidade
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 4 && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
                    <div className="text-center space-y-4 py-6">
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-500/10 text-green-500 mb-2">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-extrabold text-foreground">Sua Personalidade</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Aqui está o reflexo estratégico da sua essência. Você pode editar os resultados para que fiquem 100% com a sua cara.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <ResultCard
                            title="Sua Essência"
                            content={formData.result_essencia || ""}
                            onSave={(val) => handleInputChange("result_essencia", val)}
                            icon={<Wand2 className="w-5 h-5 text-primary" />}
                        />
                        <ResultCard
                            title="Seu Tom de Voz"
                            content={formData.result_tom_voz || ""}
                            onSave={(val) => handleInputChange("result_tom_voz", val)}
                            icon={<FileText className="w-5 h-5 text-blue-500" />}
                        />
                        <ResultCard
                            title="Como você funciona"
                            content={formData.result_como_funciona || ""}
                            onSave={(val) => handleInputChange("result_como_funciona", val)}
                            icon={<Loader2 className="w-5 h-5 text-orange-500" />}
                        />
                    </div>

                    <div className="flex flex-col items-center gap-6 pt-12">
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button variant="outline" className="px-8 border-primary text-primary hover:bg-primary/5">
                                <Pencil className="mr-2 w-4 h-4" /> Adicionar informações
                            </Button>
                            <Button onClick={() => window.print()} className="px-8 gradient-blue text-white">
                                <FileText className="mr-2 w-4 h-4" /> Exportar em PDF
                            </Button>
                        </div>

                        <p className="text-muted-foreground text-sm italic">
                            Esse documento ficará salvo aqui dentro. Você pode editar, acrescentar ou exportar quando quiser.
                        </p>

                        <div className="w-full mt-12 p-8 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 text-center space-y-6">
                            <h3 className="text-2xl font-bold">Pronta para o próximo nível?</h3>
                            <p className="text-muted-foreground max-w-xl mx-auto">
                                Agora que definimos quem você é estrategicamente, vamos transformar isso em uma marca visual inesquecível.
                            </p>
                            <Button
                                onClick={() => {
                                    completePhase.mutate(1, {
                                        onSuccess: () => navigate("/phase/2")
                                    });
                                }}
                                className="gradient-primary text-white h-14 px-12 text-xl font-bold rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                            >
                                Salvar e desbloquear DNA de Marca
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ResultCard({ title, content, onSave, icon }: { title: string; content: string; onSave: (val: string) => void; icon: React.ReactNode }) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(content);

    useEffect(() => {
        setValue(content);
    }, [content]);

    const handleSave = () => {
        onSave(value);
        setIsEditing(false);
    };

    return (
        <Card className="bg-card border-border overflow-hidden">
            <div className="p-1 h-1 bg-gradient-to-r from-primary/50 to-primary/10" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        {icon}
                    </div>
                    <CardTitle className="text-xl">{title}</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="text-primary">
                    {isEditing ? "Cancelar" : <Pencil className="w-4 h-4" />}
                </Button>
            </CardHeader>
            <CardContent className="pt-4">
                {isEditing ? (
                    <div className="space-y-4">
                        <Textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="min-h-[150px] bg-background/50 p-4 leading-relaxed"
                        />
                        <Button onClick={handleSave} className="w-full bg-primary text-white">
                            <Save className="mr-2 w-4 h-4" /> Salvar Edição
                        </Button>
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-foreground text-lg opacity-90 p-4 rounded-xl bg-background/30">
                        {content || "Aguardando geração..."}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
