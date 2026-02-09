import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Sparkles, Check, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/hooks/useBrand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChecklistState {
    habitos: boolean[];
    brain: boolean[];
    routine: boolean[];
    bau: boolean[];
    deadlines: {
        personalidade: string;
        dna: string;
        estrutura: string;
        bio: string;
        destaques: string;
        fixados: string;
    };
}

const MODULES = [
    {
        id: 1,
        title: "Personalidade & DNA de Marca",
        icon: "🧠",
        color: "#8b5cf6",
        details: {
            que: "A base de tudo. Aqui você captura sua essência, tom de voz, público, tese central e pilares de conteúdo.",
            serve: ["Alimentar TODAS as IAs", "Gerar conteúdo com sua identidade", "Nunca mais perder sua voz"],
            alimenta: "→ Estrutura Semanal, Otimização de Redes, IAs de Execução, Templates de Carrosséis",
            tempo: "5 minutos",
            dica: "Não precisa ser perfeito no início. Você pode ir ajustando com o tempo. O importante é começar.",
            action: "Começar agora",
            link: "/phase/1"
        }
    },
    {
        id: 2,
        title: "Estrutura Semanal Fixa",
        icon: "📅",
        color: "#3b82f6",
        details: {
            que: "Define TEMAS FIXOS para cada dia da semana. Ex: Segunda = Educação, Quarta = Identificação.",
            serve: ["Nunca mais começar do zero", "Criar padrão sustentável", "Público reconhece sua rotina"],
            como: "Você define 1 vez. O sistema gera 4 semanas automaticamente baseado no seu DNA + rotina + horários disponíveis.",
            alimenta: "→ Calendário, Relatório WhatsApp",
            dica: "Com o tempo, isso se torna NATURAL. Seu cérebro vai se acostumar e você terá ideias no dia certo automaticamente.",
            lembrete: "Todo dia você recebe o tema do dia no WhatsApp.",
            action: "Configurar agora",
            link: "/phase/3"
        }
    },
    {
        id: 3,
        title: "Otimização de Redes",
        icon: "📱",
        color: "#f59e0b",
        details: {
            que: "Deixa seu perfil otimizado: Bio estratégica + Destaques + Posts Fixados que vendem por você.",
            serve: ["Converter seguidores em clientes", "Não depender só de postar muito", "Perfil vende mesmo você offline"],
            primordial: "Um perfil bem estruturado reduz 50% da pressão de postar constantemente. Ele trabalha por você 24/7.",
            beneficio: "Em vez de depender de 5-7 posts por semana, você pode postar 3x e ainda assim converter MAIS — porque seu perfil faz o trabalho pesado.",
            prazos: ["Bio", "Destaques", "Posts Fixados"],
            dica: "Faça no seu ritmo. Mas DEFINA prazos sustentáveis. Essa é a fase que mais alivia a carga de produção depois.",
            alimenta: "DNA de Marca, Personalidade, Tom de Voz",
            action: "Começar Bio",
            link: "/phase/4"
        }
    },
    {
        id: 4,
        title: "IAs de Execução",
        icon: "🤖",
        color: "#10b981",
        details: {
            que: "12 IAs treinadas para criar roteiros completos de Reels, Carrosséis, Stories, E-mails, Criativos e Estratégia de vendas.",
            serve: ["Aprofundar temas", "Criar roteiros profissionais", "Nunca mais travar por falta de estrutura"],
            como: "Você fala o tema. A IA lê seu DNA automaticamente e gera roteiro completo no seu tom de voz.",
            conexao: "Lê: DNA de Marca | Salva em: Baú de Marca",
            tempo: "3-5 minutos por roteiro",
            dica: "Cada IA tem uma função específica. Use a certa para o momento certo.",
            action: "Ver todas as IAs",
            link: "/phase/6"
        }
    },
    {
        id: 5,
        title: "Templates de Carrosséis Automáticos",
        icon: "⚡",
        color: "#06b6d4",
        details: {
            que: "Geração automática de carrosséis visuais prontos para Instagram. A IA cria os 10 textos, você personaliza o visual.",
            serve: ["Criar conteúdo profundo sem designer", "Gerar 10 slides em 1 clique", "Exportar artes prontas"],
            como: "1. Escolhe tema | 2. IA gera 10 textos | 3. Você sobe imagens de fundo | 4. Personaliza | 5. Exporta.",
            importante: "A IA faz o trabalho pesado (textos). Você personaliza o visual para humanizar e dar sua identidade.",
            conexao: "Lê: DNA de Marca, Pilares de Conteúdo | Exporta para: Sua galeria",
            ideal: "Abordar assuntos importantes para sua audiência de forma rápida e profissional.",
            action: "Criar primeiro carrossel",
            link: "/phase/7"
        }
    },
    {
        id: 6,
        title: "Baú de Marca",
        icon: "📦",
        color: "#f59e0b",
        details: {
            que: "Seu lugar ÚNICO para guardar tudo da sua marca em um só lugar.",
            serve: ["Não ter arquivos espalhados", "Padronizar processos", "Guardar CTAs, frases, copies", "Centralizar tudo"],
            podeGuardar: ["Links importantes", "Logos e identidade", "Referências", "Textos estratégicos", "Copies de vendas", "Propostas"],
            especial: "Você pode EXPORTAR tudo como PDF ou compartilhar com equipe.",
            dica: "Quanto mais você usa, mais organizada sua marca fica. Vá adicionando aos poucos.",
            action: "Abrir Baú de Marca",
            link: "/phase/8"
        }
    },
    {
        id: 7,
        title: "Captura de Ideias",
        icon: "💡",
        color: "#fbbf24",
        details: {
            que: "Estrutura suas ideias soltas em conteúdo, metas, insights, produtos ou projetos.",
            serve: ["Nunca mais perder uma ideia", "IA organiza automaticamente", "Transforma pensamento em ação"],
            como: "1. Joga a ideia | 2. IA classifica: Conteúdo, Meta, Insight, Produto, Projeto | 3. Tudo se conecta.",
            conexao: "Envia conteúdo para: Estrutura Semanal | Envia meta/tarefa para: Cérebro | Cria rotinas no: Calendário",
            dica: "Use sempre que tiver uma ideia. Quanto mais você alimenta, mais o sistema aprende sobre você.",
            action: "Capturar primeira ideia",
            link: "/ideia-inbox"
        }
    },
    {
        id: 8,
        title: "Cérebro Pessoal (Assistente)",
        icon: "🧠",
        color: "#ec4899",
        details: {
            que: "Organiza TUDO da sua vida: compromissos, tarefas, hábitos, rotinas e lembretes.",
            serve: ["Tirar tudo da sua cabeça", "IA organiza automaticamente", "Você só confirma e executa"],
            como: "Você fala/escreve/envia foto. IA entende horários e recorrências automaticamente.",
            conexao: "Recebe de: Captura de Ideias | Envia para: Calendário | Notifica via: WhatsApp",
            tempo: "Use sempre que precisar",
            dica: "Quanto mais você usa, mais LEVE você se sente. Jogue tudo aqui.",
            action: "Adicionar compromisso",
            link: "/assistant"
        }
    },
    {
        id: 9,
        title: "Calendário Inteligente",
        icon: "📅",
        color: "#6366f1",
        details: {
            que: "Visão completa da sua vida: Dia, Semana, Mês e Ano.",
            serve: ["Ver tudo em um só lugar", "Gerenciar posts e ideias", "Filtrar por categoria", "Relatórios automáticos"],
            recebe: ["Posts da Estrutura", "Compromissos do Cérebro", "Tarefas de Metas", "Ideias capturadas"],
            conexao: "Recebe de: TUDO | Envia para: WhatsApp (relatório)",
            tempo: "Consulte sempre",
            action: "Abrir Calendário",
            link: "/calendar"
        }
    },
    {
        id: 10,
        title: "Relatório WhatsApp",
        icon: "📲",
        color: "#22c55e",
        details: {
            que: "Todo dia, você recebe no WhatsApp um resumo completo do dia, temas de conteúdo e lembretes importantes.",
            serve: ["Não esquecer nada", "Ter clareza do dia", "Facilitar a execução"],
            como: "Automatizado. Conecta seu Calendário e Estrutura ao seu número do WhatsApp.",
            dica: "Configure seu número e horários de notificação no seu perfil.",
            action: "Configurar Perfil",
            link: "/profile"
        }
    }
];

export default function ExploreMap() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { brand } = useBrand();
    const [expandedCard, setExpandedCard] = useState<number | null>(null);
    const [checklist, setChecklist] = useState<ChecklistState>({
        habitos: [false, false, false],
        brain: [false, false, false, false],
        routine: [false, false, false, false],
        bau: [false, false, false, false],
        deadlines: {
            personalidade: "",
            dna: "",
            estrutura: "",
            bio: "",
            destaques: "",
            fixados: ""
        }
    });

    useEffect(() => {
        if (brand && (brand as any).journey_roadmap) {
            setChecklist(prev => ({
                ...prev,
                ...((brand as any).journey_roadmap as any)
            }));
        } else if (brand && (brand as any).extra_infos) {
            // Fallback or attempt to find it in extra_infos if we couldn't add the column
            const roadmap = ((brand as any).extra_infos as any[]).find(i => i.type === 'journey_roadmap');
            if (roadmap) {
                setChecklist(roadmap.data);
            }
        }
    }, [brand]);

    const saveRoadmap = async () => {
        try {
            const { error } = await supabase
                .from("brands" as any)
                .update({
                    // We'll try to update journey_roadmap first, if it fails we might have a schema issue
                    journey_roadmap: checklist
                } as any)
                .eq("user_id", user?.id);

            if (error) {
                // Fallback to extra_infos if column doesn't exist
                const currentInfos = (brand as any)?.extra_infos || [];
                const otherInfos = (currentInfos as any[]).filter((i: any) => i.type !== 'journey_roadmap');
                const newInfos = [...otherInfos, { type: 'journey_roadmap', data: checklist }];

                const { error: fallbackError } = await supabase
                    .from("brands" as any)
                    .update({ extra_infos: newInfos } as any)
                    .eq("user_id", user?.id);

                if (fallbackError) throw fallbackError;
            }

            toast.success("Progresso salvo com sucesso!");
        } catch (error) {
            console.error("Error saving roadmap:", error);
            toast.error("Erro ao salvar progresso.");
        }
    };

    const toggleCheck = (section: keyof Omit<ChecklistState, 'deadlines'>, index: number) => {
        setChecklist(prev => {
            const newItems = [...(prev[section] as boolean[])];
            newItems[index] = !newItems[index];
            return { ...prev, [section]: newItems };
        });
    };

    const handleDeadlineChange = (id: keyof ChecklistState['deadlines'], value: string) => {
        setChecklist(prev => ({
            ...prev,
            deadlines: { ...prev.deadlines, [id]: value }
        }));
    };

    return (
        <MinimalLayout brandName={brand?.name}>
            <div className="min-h-screen bg-[#141414] text-[#EEEDE9] pb-20 overflow-x-hidden">

                {/* HEADER */}
                <header className="px-5 py-6 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#141414]/80 backdrop-blur-md z-50">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[#999]" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-[17px] font-bold">Mapa da Jornada Yah</h1>
                        <p className="text-[11px] text-[#999] uppercase tracking-wider font-medium opacity-60">Ecossistema Completo</p>
                    </div>
                    <div className="w-10" />
                </header>

                <div className="max-w-[480px] mx-auto px-5 py-8 space-y-12">

                    {/* INTRO */}
                    <section className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Como funciona a Jornada Yah</h2>
                        <p className="text-[#999] text-sm leading-relaxed px-4">Cada fase alimenta a próxima. No final, tudo se conecta para criar uma presença digital sustentável.</p>
                    </section>


                    {/* ACORDEÕES DETALHADOS */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                            <Sparkles className="w-5 h-5 text-[#B6BC45]" />
                            Módulos da Jornada
                        </h2>

                        {MODULES.map((mod) => (
                            <div key={mod.id} className="bg-[#1E1E1E] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
                                <button
                                    onClick={() => setExpandedCard(expandedCard === mod.id ? null : mod.id)}
                                    className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02]"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl">{mod.icon}</span>
                                        <span className="text-[15px] font-bold text-[#EEEDE9]">{mod.title}</span>
                                    </div>
                                    {expandedCard === mod.id ? <ChevronUp className="w-5 h-5 text-[#999]" /> : <ChevronDown className="w-5 h-5 text-[#999]" />}
                                </button>

                                {expandedCard === mod.id && (
                                    <div className="px-5 pb-6 space-y-6 border-t border-white/5 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <h4 className="text-[11px] font-bold text-[#B6BC45] uppercase tracking-widest mb-2">O que é</h4>
                                            <p className="text-[13px] text-[#BBB] leading-relaxed">{mod.details.que}</p>
                                        </div>

                                        <div>
                                            <h4 className="text-[11px] font-bold text-[#B6BC45] uppercase tracking-widest mb-2">Para que serve</h4>
                                            <ul className="space-y-1.5">
                                                {mod.details.serve.map((item, i) => (
                                                    <li key={i} className="text-[13px] text-[#BBB] flex items-center gap-2">
                                                        <div className="w-1 h-1 rounded-full bg-[#B6BC45]" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {mod.details.como && (
                                            <div>
                                                <h4 className="text-[11px] font-bold text-[#B6BC45] uppercase tracking-widest mb-2">Como funciona</h4>
                                                <p className="text-[13px] text-[#BBB] leading-relaxed">{mod.details.como}</p>
                                            </div>
                                        )}

                                        {mod.details.alimenta && (
                                            <div>
                                                <h4 className="text-[11px] font-bold text-[#B6BC45] uppercase tracking-widest mb-2">Conexão</h4>
                                                <p className="text-[13px] text-[#B6BC45] font-medium leading-relaxed">{mod.details.alimenta}</p>
                                            </div>
                                        )}

                                        <div className="flex gap-4">
                                            {mod.details.tempo && (
                                                <div className="flex-1 bg-white/5 rounded-xl p-3">
                                                    <h4 className="text-[9px] font-bold text-[#999] uppercase mb-1">Tempo</h4>
                                                    <p className="text-xs font-bold">{mod.details.tempo}</p>
                                                </div>
                                            )}
                                            <div className="flex-[2] bg-[#B6BC45]/10 rounded-xl p-3 border border-[#B6BC45]/20">
                                                <h4 className="text-[9px] font-bold text-[#B6BC45] uppercase mb-1">Dica Estratégica</h4>
                                                <p className="text-[11px] text-[#EEEDE9] leading-tight italic">{mod.details.dica}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => navigate(mod.details.link)}
                                            className="w-full bg-[#B6BC45] text-[#141414] font-bold py-3.5 rounded-xl text-sm hover:transform hover:scale-[1.02] transition-all duration-200"
                                        >
                                            {mod.details.action} →
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* CHECKLIST INTERATIVO */}
                    <section className="pt-8 space-y-10">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#B6BC45]/10 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-[#B6BC45]" />
                                </div>
                                Como aproveitar 100% do Yah
                            </h2>
                        </div>

                        {/* BLOCO 1 */}
                        <div className="bg-[#1E1E1E] border border-white/5 rounded-2xl p-6 space-y-5">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-[#B6BC45]">Vá alimentando aos poucos</h3>
                            <div className="space-y-3">
                                {[
                                    "Jogue compromissos no Cérebro",
                                    "Capture ideias sempre que surgirem",
                                    "Adicione tarefas e hábitos"
                                ].map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => toggleCheck('habitos', i)}
                                        className="w-full flex items-center gap-4 text-left group"
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                            checklist.habitos[i] ? "bg-[#B6BC45] border-[#B6BC45]" : "border-white/10 group-hover:border-[#B6BC45]/50"
                                        )}>
                                            {checklist.habitos[i] && <Check className="w-4 h-4 text-[#141414]" />}
                                        </div>
                                        <span className={cn("text-[15px] font-medium", checklist.habitos[i] ? "text-[#999] line-through" : "text-[#EEEDE9]")}>
                                            {item}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-[#999] italic mt-4 pt-4 border-t border-white/5">
                                💡 Quanto mais você tira da cabeça, mais LEVE você se sente.
                            </p>
                        </div>

                        {/* BLOCO 2 - PRAZOS */}
                        <div className="bg-[#1E1E1E] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-5">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                                <h3 className="text-[12px] font-bold uppercase tracking-widest text-[#B6BC45]">Defina prazos sugeridos</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {[
                                    { id: 'personalidade', label: 'Personalidade' },
                                    { id: 'dna', label: 'DNA de Marca' },
                                    { id: 'estrutura', label: 'Estrutura Semanal' },
                                    { id: 'bio', label: 'Otimização Bio' },
                                    { id: 'destaques', label: 'Destaques' },
                                    { id: 'fixados', label: 'Posts Fixados' },
                                ].map((field) => (
                                    <div key={field.id} className="flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider px-1">{field.label}</label>
                                        <input
                                            type="date"
                                            value={checklist.deadlines[field.id as keyof ChecklistState['deadlines']]}
                                            onChange={(e) => handleDeadlineChange(field.id as keyof ChecklistState['deadlines'], e.target.value)}
                                            className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-[13px] font-medium text-[#EEEDE9] focus:border-[#B6BC45]/50 focus:bg-white/[0.06] outline-none transition-all w-full color-scheme-dark"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="text-[10px] text-[#555] italic bg-black/10 p-2.5 rounded-lg border border-white/5 flex items-start gap-2">
                                <span>💡</span>
                                <span>Dica: Comece pela Bio e o DNA. São as bases essenciais.</span>
                            </div>
                        </div>

                        {/* BLOCO 3 */}
                        <div className="bg-[#1E1E1E] border border-white/5 rounded-2xl p-6 space-y-5">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-[#B6BC45]">Rotina de Postagem</h3>
                            <div className="space-y-4">
                                {[
                                    "Defina quantos dias vai postar",
                                    "Escolha dias para PLANEJAR",
                                    "Escolha dias para EXECUTAR",
                                    "Marque seus horários fixos"
                                ].map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => toggleCheck('routine', i)}
                                        className="w-full flex items-center gap-4 text-left group"
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                            checklist.routine[i] ? "bg-[#B6BC45] border-[#B6BC45]" : "border-white/10 group-hover:border-[#B6BC45]/50"
                                        )}>
                                            {checklist.routine[i] && <Check className="w-4 h-4 text-[#141414]" />}
                                        </div>
                                        <span className={cn("text-[15px] font-medium", checklist.routine[i] ? "text-[#999] line-through" : "text-[#EEEDE9]")}>
                                            {item}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SAVE BUTTON */}
                        <button
                            onClick={saveRoadmap}
                            className="w-full bg-[#B6BC45] text-[#141414] font-bold py-4 rounded-2xl text-[15px] shadow-[0_8px_32px_rgba(182,188,69,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            Salvar meu Plano de Ação
                        </button>
                    </section>

                    {/* VISUALIZAÇÃO DE CONEXÕES FOOTER */}
                    <section className="bg-gradient-to-br from-[#B6BC45]/10 to-transparent border border-[#B6BC45]/20 rounded-2xl p-8 text-center">
                        <h3 className="text-lg font-bold text-[#EEEDE9] mb-3">Tudo se Conecta</h3>
                        <p className="text-[13px] text-[#999] leading-relaxed">Cada dado que você insere alimenta o Cérebro da sua Marca. Com o tempo, a Yah se torna cada vez mais parecida com você, antecipando suas necessidades e otimizando sua rotina.</p>
                    </section>

                </div>
            </div>
        </MinimalLayout>
    );
}
