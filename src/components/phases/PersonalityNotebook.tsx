import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generatePDF } from "@/lib/pdf";
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
    "Outro"
];

// ... (rest of imports area, no change needed there)


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
    const [isFormInitialized, setIsFormInitialized] = useState(false);
    const [activeEditingCard, setActiveEditingCard] = useState<string | null>(null);
    const isDirty = useRef(false);

    useEffect(() => {
        if (brand && !isFormInitialized) {
            setFormData(brand);
            setIsFormInitialized(true);
            // Skip to results if they already exist
            if (brand.result_essencia && step === 1) {
                setStep(4);
            }
        } else if (brand && isFormInitialized && brand.result_essencia && step === 1) {
            // This handles cases where brand might update later and we need to skip,
            // but formData should not be re-initialized.
            setStep(4);
        }
    }, [brand, isFormInitialized, step]);

    const handleInputChange = (field: keyof Brand, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        isDirty.current = true;
    };

    // Auto-save logic with debounce
    useEffect(() => {
        if (!brand) return;

        const timer = setTimeout(() => {
            const changedFields: Partial<Brand> = {};
            let hasChanges = false;

            Object.keys(formData).forEach((key) => {
                const k = key as keyof Brand;
                // Basic comparison, could be improved for arrays if needed
                if (JSON.stringify(formData[k]) !== JSON.stringify(brand[k])) {
                    (changedFields as any)[k] = formData[k];
                    hasChanges = true;
                }
            });

            if (hasChanges && isDirty.current) {
                updateBrand.mutate({ updates: changedFields, silent: true });
                isDirty.current = false;
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [formData, brand]);

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

    const handleAddExtraInfo = () => {
        console.log("Adding extra info...");
        const newInfo = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            title: "Nova Informação (clique no lápis para editar)",
            content: "Descreva aqui a informação adicional..."
        };
        const currentExtras = formData.extra_infos || [];
        handleInputChange("extra_infos", [...currentExtras, newInfo]);
        // Automatically open for editing
        setActiveEditingCard(newInfo.id);
        toast.success("Nova caixa de informação adicionada!");
    };

    const handleUpdateExtraInfo = (id: string, newContent: string, newTitle?: string) => {
        const currentExtras = formData.extra_infos || [];
        const updatedExtras = currentExtras.map(info =>
            info.id === id
                ? { ...info, content: newContent, title: newTitle || info.title }
                : info
        );
        handleInputChange("extra_infos", updatedExtras);
    };

    const handleDeleteExtraInfo = (id: string) => {
        const currentExtras = formData.extra_infos || [];
        const updatedExtras = currentExtras.filter(info => info.id !== id);
        handleInputChange("extra_infos", updatedExtras);
        toast.success("Informação removida.");
    };

    const handleGeneratePersonality = async () => {
        const toastId = toast.loading("IA analisando seu perfil comportamental...");
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

            const extraInfoText = formData.extra_infos?.map(info => `${info.title}: ${info.content}`).join("\n        ") || "";

            const prompt = `Com base nestas informações, gere um perfil de personalidade estratégico:
        Profissão/Papel: ${formData.user_role}
        Motivação: ${formData.user_motivation}
        Mudança que quer gerar: ${formData.user_change_world}
        Tom de voz selecionado: ${formData.user_tone_selected?.join(", ")}
        Perfil criativo: ${formData.user_creative_profile?.join(", ")}
        Horários de energia: ${formData.user_energy_times?.join(", ")}
        Trava/Cansaço: ${formData.user_blockers}
        Informações Adicionais:
        ${extraInfoText}

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
                updates: {
                    result_essencia: results.result_essencia,
                    result_tom_voz: results.result_tom_voz,
                    result_como_funciona: results.result_como_funciona
                }
            });

            // Update local state immediately so user sees results without refresh
            setFormData(prev => ({
                ...prev,
                result_essencia: results.result_essencia,
                result_tom_voz: results.result_tom_voz,
                result_como_funciona: results.result_como_funciona
            }));

            setStep(4);
            toast.success("Personalidade gerada com sucesso!", { id: toastId });
        } catch (error: any) {
            console.error("AI Generation error:", error);
            toast.error("Erro ao gerar personalidade: " + error.message, { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportPDF = () => {
        const cleanContent = (text: string) => {
            if (!text) return "Não preenchido";
            try {
                if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
                    const parsed = JSON.parse(text);
                    if (Array.isArray(parsed)) {
                        return parsed.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(", ");
                    } else if (typeof parsed === 'object') {
                        return Object.entries(parsed)
                            .map(([key, val]) => `${key.replace(/_/g, ' ').toUpperCase()}:\n${val}`)
                            .join("\n\n");
                    }
                }
            } catch (e) {
                // Not JSON
            }
            return text;
        };

        const sections = [
            { title: "Sua Essência", content: cleanContent(formData.result_essencia || "") },
            { title: "Seu Tom de Voz", content: cleanContent(formData.result_tom_voz || "") },
            { title: "Como você funciona", content: cleanContent(formData.result_como_funciona || "") },
            ...(formData.extra_infos?.map(info => ({
                title: info.title,
                content: cleanContent(info.content)
            })) || [])
        ];

        generatePDF({
            title: "Caderno de Personalidade - YAH 2.0",
            sections,
            fileName: "personalidade-yah.pdf"
        });
    };



    const progressMap: Record<number, number> = {
        1: 20,
        2: 50,
        3: 75,
        4: 100
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 print:hidden">
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
                        <div className="flex justify-end pt-4 w-full">
                            <Button onClick={() => setStep(2)} className="w-full md:w-auto gradient-primary text-white px-8">
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
                                            (formData.user_tone_selected || []).some(t => t.startsWith(option) || (option === "Outro" && !TONE_OPTIONS.slice(0, 6).includes(t)))
                                                ? "border-primary bg-primary/10"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <Checkbox
                                            checked={(formData.user_tone_selected || []).some(t => t.startsWith(option) || (option === "Outro" && !TONE_OPTIONS.slice(0, 6).includes(t)))}
                                            className="rounded-full"
                                        />
                                        <span className="font-medium">{option}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Custom Tone Input */}
                            {(formData.user_tone_selected || []).some(t => !TONE_OPTIONS.slice(0, 6).includes(t)) && (
                                <div className="space-y-2 animate-fade-in pl-4 border-l-2 border-primary/30">
                                    <Label className="text-sm">Qual outro tom?</Label>
                                    <Input
                                        placeholder="Ex: Poético, Sarcástico, Motivacional..."
                                        value={(formData.user_tone_selected || []).find(t => !TONE_OPTIONS.slice(0, 6).includes(t))?.replace("Outro: ", "") || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const currentTones = formData.user_tone_selected || [];
                                            // Remove old custom tone
                                            const cleanTones = currentTones.filter(t => TONE_OPTIONS.slice(0, 6).includes(t));

                                            if (val.trim()) {
                                                handleInputChange("user_tone_selected", [...cleanTones, `Outro: ${val}`]);
                                            } else {
                                                handleInputChange("user_tone_selected", [...cleanTones, "Outro"]);
                                            }
                                        }}
                                        className="bg-background/50 border-primary/50"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col-reverse md:flex-row justify-between pt-4 gap-3 md:gap-0">
                            <Button variant="outline" onClick={() => setStep(1)} className="w-full md:w-auto">
                                <ChevronLeft className="mr-2 w-4 h-4" /> Voltar
                            </Button>
                            <Button onClick={() => setStep(3)} className="w-full md:w-auto gradient-primary text-white px-8">
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

                        <div className="flex flex-col-reverse md:flex-row justify-between pt-6 gap-3 md:gap-0">
                            <Button variant="outline" onClick={() => setStep(2)} className="w-full md:w-auto">
                                <ChevronLeft className="mr-2 w-4 h-4" /> Voltar
                            </Button>
                            <Button
                                onClick={handleGeneratePersonality}
                                disabled={isGenerating}
                                className="w-full md:w-auto gradient-primary text-white px-4 md:px-10 h-auto min-h-[3rem] py-3 md:py-0 text-sm md:text-lg shadow-lg shadow-primary/20 whitespace-normal leading-tight mx-auto"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 animate-spin w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                                        Tecendo sua personalidade...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="mr-2 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
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
                        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">Sua Personalidade</h2>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                            Aqui está o reflexo estratégico da sua essência. Você pode editar os resultados para que fiquem 100% com a sua cara.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 print:block print:space-y-6">
                        <ResultCard
                            title="Sua Essência"
                            content={formData.result_essencia || ""}
                            onSave={(val) => handleInputChange("result_essencia", val)}
                            isEditing={activeEditingCard === "result_essencia"}
                            onToggle={() => setActiveEditingCard(activeEditingCard === "result_essencia" ? null : "result_essencia")}
                            icon={<Wand2 className="w-5 h-5 text-primary" />}
                        />
                        <ResultCard
                            title="Seu Tom de Voz"
                            content={formData.result_tom_voz || ""}
                            onSave={(val) => handleInputChange("result_tom_voz", val)}
                            isEditing={activeEditingCard === "result_tom_voz"}
                            onToggle={() => setActiveEditingCard(activeEditingCard === "result_tom_voz" ? null : "result_tom_voz")}
                            icon={<FileText className="w-5 h-5 text-blue-500" />}
                        />
                        <ResultCard
                            title="Como você funciona"
                            content={formData.result_como_funciona || ""}
                            onSave={(val) => handleInputChange("result_como_funciona", val)}
                            isEditing={activeEditingCard === "result_como_funciona"}
                            onToggle={() => setActiveEditingCard(activeEditingCard === "result_como_funciona" ? null : "result_como_funciona")}
                            icon={<Loader2 className="w-5 h-5 text-orange-500" />}
                        />

                        {/* Extra Infos Rendering */}
                        {formData.extra_infos?.map((info) => (
                            <ResultCard
                                key={info.id}
                                title={info.title}
                                content={info.content}
                                onSave={(content, title) => handleUpdateExtraInfo(info.id, content, title)}
                                isEditing={activeEditingCard === info.id}
                                onToggle={() => setActiveEditingCard(activeEditingCard === info.id ? null : info.id)}
                                icon={<FileText className="w-5 h-5 text-green-500" />}
                                onTitleSave={true}
                                onDelete={() => handleDeleteExtraInfo(info.id)}
                            />
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-6 pt-12 print:hidden">
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button
                                variant="outline"
                                onClick={handleAddExtraInfo}
                                className="px-8 border-primary text-primary hover:bg-primary/5"
                            >
                                <Pencil className="mr-2 w-4 h-4" /> Adicionar informações
                            </Button>
                            <Button onClick={handleExportPDF} className="px-8 gradient-blue text-white">
                                <FileText className="mr-2 w-4 h-4" /> Exportar em PDF
                            </Button>
                        </div>

                        <p className="text-muted-foreground text-sm italic">
                            Esse documento ficará salvo aqui dentro. Você pode editar, acrescentar ou exportar quando quiser.
                        </p>

                        <div className="w-full mt-12 p-8 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 text-center space-y-6 print:hidden">
                            <h3 className="text-2xl font-bold">Pronta para o próximo nível?</h3>
                            <p className="text-muted-foreground max-w-xl mx-auto">
                                Agora que definimos quem você é estrategicamente, vamos transformar isso em uma marca visual inesquecível.
                            </p>
                            <Button
                                onClick={() => {
                                    completePhase.mutate(1);
                                    navigate("/phase/2");
                                }}
                                className="w-full md:w-auto gradient-primary text-white h-auto py-4 px-8 md:px-12 text-lg md:text-xl font-bold rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform whitespace-normal"
                            >
                                Salvar e desbloquear DNA de Marca
                            </Button>
                        </div>
                    </div>
                </div >
            )
            }
        </div >
    );
}

function ResultCard({ title, content, onSave, icon, isEditing, onToggle, onTitleSave, onDelete }: {
    title: string;
    content: string;
    onSave: (val: string, title?: string) => void;
    icon: React.ReactNode;
    isEditing: boolean;
    onToggle: () => void;
    onTitleSave?: boolean;
    onDelete?: () => void;
}) {
    const [value, setValue] = useState(content);
    const [titleValue, setTitleValue] = useState(title);

    useEffect(() => {
        setValue(content);
        setTitleValue(title);
    }, [content, title]);

    const handleSave = () => {
        onSave(value, titleValue);
        onToggle();
    };

    const formatContent = (text: string) => {
        if (!text) return "Aguardando geração...";
        try {
            // Try to parse if it looks like JSON objects/arrays
            if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    return (
                        <div className="flex flex-wrap gap-2">
                            {parsed.map((item, i) => (
                                <span key={i} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium print:border print:border-gray-300 print:text-black">
                                    {typeof item === 'string' ? item : JSON.stringify(item)}
                                </span>
                            ))}
                        </div>
                    );
                } else if (typeof parsed === 'object') {
                    return (
                        <div className="space-y-2">
                            {Object.entries(parsed).map(([key, val]) => (
                                <div key={key} className="bg-white/5 p-3 rounded-lg print:bg-transparent print:p-0 print:border-b print:border-gray-200">
                                    <strong className="text-primary block capitalize mb-1 print:text-black">{key.replace(/_/g, ' ')}:</strong>
                                    <span className="text-foreground/90 print:text-black">{String(val)}</span>
                                </div>
                            ))}
                        </div>
                    );
                }
            }
        } catch (e) {
            // Not JSON or parse error, return raw text
        }
        return text;
    };

    return (
        <Card className="bg-card border-border overflow-hidden print:shadow-none print:border print:border-gray-300 print:bg-white print:mb-4">
            <div className="p-1 h-1 bg-gradient-to-r from-primary/50 to-primary/10 print:hidden" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 print:hidden">
                        {icon}
                    </div>
                    {isEditing && onTitleSave ? (
                        <Input
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            className="h-8 font-bold text-lg bg-background/50 border-primary/30"
                            placeholder="Título da informação"
                        />
                    ) : (
                        <CardTitle className="text-xl truncate print:text-2xl print:text-black">{title}</CardTitle>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {onDelete && isEditing && (
                        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:bg-red-500/10 flex-shrink-0 ml-2 print:hidden" title="Excluir">
                            <span className="sr-only">Excluir</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={onToggle} className="text-primary flex-shrink-0 ml-2 print:hidden">
                        {isEditing ? "Cancelar" : <Pencil className="w-4 h-4" />}
                    </Button>
                </div>
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
                    <div className="whitespace-pre-wrap leading-relaxed text-foreground text-lg opacity-90 p-4 rounded-xl bg-background/30 break-words overflow-hidden print:bg-transparent print:p-0 print:text-black print:text-base">
                        {typeof formatContent(content) === 'string' ? content : formatContent(content)}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
