import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/hooks/useBrand";
import { useProfile } from "@/hooks/useProfile";
import { phases } from "@/lib/phases";
import { Loader2, Mic, Lightbulb, Check, Map, CalendarDays, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MiniCalendar } from "@/components/workspace/MiniCalendar";
import { cn } from "@/lib/utils";
import { expandRecurringEvents } from "@/components/calendar/utils/recurrenceUtils";

// Phases to display in the dashboard (skipping 5 and 9 as per design/existing logic)
const DASHBOARD_PHASE_IDS = [1, 2, 3, 4, 6, 7, 8];

const DAILY_TIPS = [
  "Comece pelo Assistente — organize sua semana que o sistema sustenta",
  "Capture uma ideia e estruture, antes que ela se perca.",
  "Seu Cérebro de Marca está ativado! Ele já começou a aprender com suas respostas. Para acelerar o processo, que tal adicionar mais hábitos no assistente?",
  "Lembre-se: o YAH 2.0 é seu copiloto. Quanto mais você o usa, mais ele se adapta ao seu ritmo e estilo. Que tal dar uma olhada na sua Estrutura Semanal?",
  "A inteligência do YAH 2.0 é construída com a sua interação! Cada clique, edição e aprovação o torna mais afiado. Tem alguma ideia solta para capturar hoje?",
  "Use o Guardar Ideias — transforme impulso em estratégia.",
  "Transforme ideias em conteúdo de forma mais rápida e com a certeza de que a Yah está trabalhando para você, não por você.",
  "Planeje seu conteúdo — presença digital sem improviso",
  "Quer um YAH 2.0 ainda mais poderoso? Use-o diariamente! Ele aprende com seus padrões e preferências. Qual é a sua maior prioridade de conteúdo para hoje?",
  "Acabe com a angústia da folha em branco. Sua semana de conteúdo está planejada, pronta para ser refinada por você.",
  "Que tal revisar as headlines sugeridas para hoje?",
  "Sua semana está pré-preenchida! Use a função ‘Ajustar Rotina’ para personalizar ainda mais.",
  "Estruture sua vida, não deixe compromissos na sua sua cabeça, fale com o seu assistente pessoal que ele cuida para você."
];

export default function Dashboard() {
  const { brand, isLoading: brandLoading } = useBrand();
  const { profile, isLoading: profileLoading } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [todaysTasks, setTodaysTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tipsExpanded, setTipsExpanded] = useState(true);

  // Fetch tasks for today
  useEffect(() => {
    if (user) {
      fetchTodaysTasks();

      // Subscribe to realtime changes for tasks
      const channel = supabase
        .channel('dashboard-tasks')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'eventos_do_cerebro', filter: `user_id=eq.${user.id}` },
          () => fetchTodaysTasks()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTodaysTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from("eventos_do_cerebro")
        .select("*")
        .eq("user_id", user?.id);

      if (error) throw error;

      const now = new Date();
      // Use local date for current day string to match how they are stored
      const todayStr = format(now, "yyyy-MM-dd");

      const expanded = expandRecurringEvents(
        (data as any) || [],
        startOfDay(now),
        endOfDay(now)
      );

      // Filter for exactly today's instances
      const todayTasks = expanded.filter(t => t.data === todayStr);
      setTodaysTasks(todayTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setTasksLoading(false);
    }
  };

  const toggleTask = async (task: any) => {
    try {
      const isVirtual = task.id.includes("-virtual-");
      const realId = isVirtual ? task.id.split("-virtual-")[0] : task.id;
      const isCompleted = task.status === "Concluído";
      const newStatus = isCompleted ? "Pendente" : "Concluído";

      // If it's recurring, we update the 'concluidos' array instead of 'status'
      if (task.recorrencia !== "Nenhuma") {
        // We need the latest master event to get the current 'concluidos' list
        const { data: masterEvent, error: fetchError } = await (supabase as any)
          .from("eventos_do_cerebro")
          .select("concluidos")
          .eq("id", realId)
          .single();

        if (fetchError) throw fetchError;

        const currentCompletions = masterEvent.concluidos || [];
        const taskDate = task.data;
        const newCompletions = isCompleted
          ? currentCompletions.filter((d: string) => d !== taskDate)
          : [...currentCompletions, taskDate];

        const { error: updateError } = await (supabase as any)
          .from("eventos_do_cerebro")
          .update({ concluidos: newCompletions })
          .eq("id", realId);

        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await (supabase as any)
          .from("eventos_do_cerebro")
          .update({ status: newStatus })
          .eq("id", realId);

        if (updateError) throw updateError;
      }

      // Optimistic update
      setTodaysTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ));

      if (newStatus === "Concluído") {
        toast.success("Tarefa concluída!");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const currentPhaseId = brand?.current_phase || 1;
  const completedPhases = brand?.phases_completed || [];

  const nextPhaseId = [1, 2, 3, 4].find(id => !completedPhases.includes(id)) || 5;
  const isJourneyComplete = [1, 2, 3, 4].every(id => completedPhases.includes(id));

  const handleContinueJourney = () => {
    if (isJourneyComplete) return;
    navigate(`/phase/${nextPhaseId}`);
  };

  const getContinueButtonText = () => {
    if (isJourneyComplete) return "Tarefas concluídas";

    const phaseNames: Record<number, string> = {
      1: "Caderno de Personalidade",
      2: "DNA da Marca",
      3: "Estrutura Semanal Fixa",
      4: "Otimização das Redes"
    };

    return `Continuar: ${phaseNames[nextPhaseId] || "Jornada"}`;
  };

  if (brandLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#B6BC45]" />
      </div>
    );
  }

  // Render main layout after variables are defined
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const dailyTipIndex = dayOfYear % DAILY_TIPS.length;
  const currentTip = DAILY_TIPS[dailyTipIndex];

  return (
    <MinimalLayout brandName={brand?.name}>
      {/* 
        Overriding minimal layout background to match specific design 
        styles are applied directly to elements to ensure fidelity 
      */}
      <div className="flex-1 bg-[#141414] text-[#EEEDE9] font-sans p-5 sm:p-6 pb-20">
        <div className="max-w-[480px] mx-auto w-full space-y-8 animate-fade-in">

          {/* Header - Boas Vindas */}
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#EEEDE9] mb-2">
                Bom te ver por aqui, <span className="text-[#B6BC45]">{profile?.full_name?.split(' ')[0] || "Criador"}</span>!
              </h1>
              <p className="text-sm text-[#999]">Vamos continuar construindo sua presença digital</p>
            </div>

            {!isJourneyComplete && (
              <button
                onClick={handleContinueJourney}
                className="w-full font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 text-[15px] bg-gradient-to-br from-[#B6BC45] to-[#9DA139] text-[#141414] shadow-[0_4px_12px_rgba(182,188,69,0.2)] hover:shadow-[0_6px_16px_rgba(182,188,69,0.3)] hover:-translate-y-0.5"
              >
                {getContinueButtonText()}
              </button>
            )}

            {isJourneyComplete && (
              <div className="bg-[#1E1E1E] border border-[#B6BC45]/20 rounded-2xl overflow-hidden mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <button
                  onClick={() => setTipsExpanded(!tipsExpanded)}
                  className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#B6BC45]/10 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[#B6BC45]" />
                    </div>
                    <h3 className="text-[17px] font-bold text-[#EEEDE9]">Confira as próximas dicas</h3>
                  </div>
                  {tipsExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#999]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#999]" />
                  )}
                </button>

                {tipsExpanded && (
                  <div className="px-6 pb-6 space-y-4 text-[14px] text-[#999] leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="border-l-2 border-[#B6BC45]/30 pl-4 py-1 text-[#EEEDE9]/90 font-medium">
                      {currentTip}
                    </p>
                    <p className="pt-2 text-[#999]/60 italic text-xs">"Sua marca agora tem alma e estratégia. Continue criando!"</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Ícones Principais */}
          <section className="grid grid-cols-2 gap-4">
            <Link
              to="/assistant"
              className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 text-center hover:-translate-y-1 hover:border-[#B6BC45] hover:shadow-[0_8px_24px_rgba(182,188,69,0.15)] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#B6BC45] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-4xl block mb-3">🧠</span>
              <h3 className="text-[15px] font-semibold text-[#EEEDE9] mb-1.5">Assistente</h3>
              <p className="text-xs text-[#999] mb-3 leading-snug">Fale, organize e receba avisos</p>
              <span className="inline-block bg-[#2A2A2A] border border-[#3A3A3A] text-[#B6BC45] text-[13px] font-medium px-4 py-2 rounded-lg group-hover:bg-[#B6BC45] group-hover:text-[#141414] transition-colors">
                Abrir
              </span>
            </Link>

            <Link
              to="/ideia-inbox"
              className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 text-center hover:-translate-y-1 hover:border-[#B6BC45] hover:shadow-[0_8px_24px_rgba(182,188,69,0.15)] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#B6BC45] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-4xl block mb-3">💡</span>
              <h3 className="text-[15px] font-semibold text-[#EEEDE9] mb-1.5">Ideias</h3>
              <p className="text-xs text-[#999] mb-3 leading-snug">Alívio cognitivo + organização</p>
              <span className="inline-block bg-[#2A2A2A] border border-[#3A3A3A] text-[#B6BC45] text-[13px] font-medium px-4 py-2 rounded-lg group-hover:bg-[#B6BC45] group-hover:text-[#141414] transition-colors">
                Capturar
              </span>
            </Link>
          </section>

          {/* Seu Dia Hoje */}
          <section className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-semibold text-[#EEEDE9] tracking-tight">SEU DIA HOJE</h2>
              <span className="text-[14px] text-[#999] opacity-70">{format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>

            <div className="space-y-1">
              {tasksLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B6BC45]" />
                </div>
              ) : todaysTasks.length > 0 ? (
                todaysTasks.map((task) => {
                  const isCompleted = task.status === "Concluído";
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task)}
                      className={cn(
                        "flex items-center py-4 border-b border-white/5 cursor-pointer transition-all active:scale-[0.98]",
                        "last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl group",
                        isCompleted && "opacity-60"
                      )}
                    >
                      <div className={cn(
                        "w-[22px] h-[22px] min-w-[22px] border-2 rounded-[6px] mr-4 flex items-center justify-center transition-all duration-300",
                        isCompleted ? "bg-[#B6BC45] border-[#B6BC45]" : "border-[#3A3A3A] group-hover:border-[#B6BC45]/50"
                      )}>
                        {isCompleted && <Check className="w-3.5 h-3.5 text-[#141414] stroke-[4]" />}
                      </div>
                      <span className={cn(
                        "text-[15px] text-[#EEEDE9] flex-1 font-medium transition-all duration-300",
                        isCompleted && "line-through text-[#999] opacity-80"
                      )}>
                        {task.titulo}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[17px] text-[#999] italic font-medium opacity-60">Nenhuma tarefa para hoje.</p>
                </div>
              )}
            </div>
          </section>

          {/* Jornada Digital */}
          <section id="journey" className="space-y-4">
            <h2 className="text-lg font-semibold text-[#EEEDE9]">Fases da sua jornada digital</h2>

            <div className="space-y-4">
              {DASHBOARD_PHASE_IDS.map((phaseId) => {
                const phaseConfig = phases.find(p => p.id === phaseId);
                if (!phaseConfig) return null;

                const isCompleted = completedPhases.includes(phaseId);
                const isCurrent = currentPhaseId === phaseId;
                const isLocked = false;

                // Match specific HTML titles if they differ
                const displayTitle =
                  phaseId === 3 ? "Estrutura Semanal Fixa" :
                    phaseId === 7 ? "Carrosséis com Yah" :
                      phaseConfig.title;

                const displayShortTitle =
                  phaseId === 3 ? "Organização" :
                    phaseConfig.shortTitle;

                // Dynamic progress simulation based on status
                const progressWidth = isCompleted ? "100%" : isCurrent ? "20%" : "0%";

                return (
                  <div
                    key={phaseId}
                    className={cn(
                      "group bg-gradient-to-br from-[#1E1E1E] to-[#252525] border border-[#2A2A2A] rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-x-1",
                      isCurrent && "border-[#B6BC45]/50 shadow-[0_0_15px_rgba(182,188,69,0.05)]",
                      !isLocked && "hover:border-[#B6BC45] cursor-pointer"
                    )}
                    onClick={() => !isLocked && navigate(phaseConfig.href)}
                  >
                    {!isLocked && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#B6BC45] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}

                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-[#2A2A2A] rounded-xl flex items-center justify-center mr-3 text-xl">
                        <phaseConfig.icon className={cn("w-5 h-5", isCurrent ? "text-[#B6BC45]" : "text-[#EEEDE9]")} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[15px] font-semibold text-[#EEEDE9]">{displayTitle}</div>
                        <div className="text-xs text-[#B6BC45] uppercase tracking-wider font-bold opacity-80">{displayShortTitle}</div>
                      </div>
                    </div>

                    <p className="text-[13px] text-[#999] mb-3 leading-relaxed line-clamp-2">
                      {phaseConfig.description || "Avance para desbloquear novos potenciais da sua marca."}
                    </p>

                    <div className="bg-[#2A2A2A] h-1.5 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-[#B6BC45] to-[#C8CF5A] rounded-full transition-all duration-1000 ease-out"
                        style={{ width: progressWidth }}
                      />
                    </div>

                    {isCurrent && (
                      <p className="text-xs text-[#B6BC45] font-medium mb-2">Próximo passo: Continuar progresso</p>
                    )}

                    <div className="flex gap-2 mt-3">
                      {!isLocked ? (
                        <>
                          {isCompleted ? (
                            <button className="flex-1 bg-[#2A2A2A] border border-[#3A3A3A] text-[#EEEDE9] text-[13px] py-2.5 rounded-lg hover:bg-[#B6BC45] hover:text-[#141414] hover:border-[#B6BC45] transition-colors font-medium">
                              {(phaseId === 3 || phaseId === 4) ? "Organizar" : "Ver documento"}
                            </button>
                          ) : (
                            <button className="flex-1 bg-[#B6BC45] border border-[#B6BC45] text-[#141414] text-[13px] py-2.5 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold">
                              {(phaseId === 3 || phaseId === 4) ? "Organizar" :
                                phaseId === 6 ? "Entrar" :
                                  phaseId === 7 ? "Criar" :
                                    phaseId === 8 ? "Guardar" :
                                      (isCurrent ? "Continuar" : "Começar")}
                            </button>
                          )}
                        </>
                      ) : (
                        <button disabled className="flex-1 bg-[#2A2A2A] border border-[#3A3A3A] text-[#999] text-[13px] py-2.5 rounded-lg opacity-50 cursor-not-allowed">
                          Bloqueado
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Hoje você pode falar - Dynamic Content from Weekly Planner */}
          <section className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-[#B6BC45] mb-4">Hoje você pode falar no digital sobre:</h2>

            {(() => {
              // Get current day index (0-6)
              const today = new Date();
              const dayIndex = today.getDay();

              // Get today's content from Week 1 (index 0)
              // We assume Week 1 is the current active week for the dashboard view
              const weeklyData = brand?.weekly_structure_data || {};
              const todayData = weeklyData[0]?.[dayIndex] || {};

              const feed = todayData.feed;
              const stories = todayData.stories;

              const hasFeed = feed?.headline || feed?.intention;
              const hasStories = stories?.headline || stories?.intention;

              if (!hasFeed && !hasStories) {
                return (
                  <div className="py-4 text-center text-[#999] text-sm italic">
                    Nenhum conteúdo planejado para hoje.
                    <button onClick={() => navigate('/phase/3')} className="ml-2 text-[#B6BC45] hover:underline underline-offset-4">
                      Ir para o Planejador
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Feed Section */}
                  <div className="border-b border-[#2A2A2A] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-[#B6BC45]">Feed</div>
                      {hasFeed && (
                        <span className="text-[10px] bg-[#2A2A2A] text-[#999] px-2 py-0.5 rounded border border-[#3A3A3A]">
                          {feed?.format || 'Formato indefinido'}
                        </span>
                      )}
                    </div>
                    {hasFeed ? (
                      <>
                        <div className="text-[14px] text-[#EEEDE9] font-medium mb-1">{feed?.headline || 'Sem título definido'}</div>
                        <div className="text-[13px] text-[#999]">
                          <span className="opacity-70">Intenção:</span> {feed?.intention || '-'}
                        </div>
                      </>
                    ) : (
                      <div className="text-[13px] text-[#999] italic">Nada planejado para o feed hoje.</div>
                    )}
                  </div>

                  {/* Stories Section */}
                  <div className="border-b border-[#2A2A2A] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-[#B6BC45]">Stories</div>
                      {hasStories && (
                        <span className="text-[10px] bg-[#2A2A2A] text-[#999] px-2 py-0.5 rounded border border-[#3A3A3A]">
                          {stories?.format || 'Formato indefinido'}
                        </span>
                      )}
                    </div>
                    {hasStories ? (
                      <>
                        <div className="text-[14px] text-[#EEEDE9] font-medium mb-1">{stories?.headline || 'Sem título definido'}</div>
                        <div className="text-[13px] text-[#999]">
                          <span className="opacity-70">Intenção:</span> {stories?.intention || '-'}
                        </div>
                      </>
                    ) : (
                      <div className="text-[13px] text-[#999] italic">Nada planejado para os stories hoje.</div>
                    )}
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Calendar Section - Using MiniCalendar Component */}
          <Link
            to="/calendar"
            className="flex items-center justify-between gap-4 bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5 hover:border-[#B6BC45] hover:shadow-[0_4px_16px_rgba(182,188,69,0.15)] transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl flex items-center justify-center group-hover:bg-[#B6BC45] group-hover:text-[#141414] group-hover:border-[#B6BC45] transition-colors text-[#B6BC45]">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-[15px] font-semibold text-[#EEEDE9] mb-0.5 group-hover:text-[#B6BC45] transition-colors">Calendário - gestão de rotinas</h3>
                <p className="text-xs text-[#999]">Visão geral, rotinas, compromisso e tarefas</p>
              </div>
            </div>
            <span className="bg-[#B6BC45] text-[#141414] text-[13px] font-bold px-4 py-2 rounded-lg hover:shadow-lg hover:scale-105 transition-all">
              Criar
            </span>
          </Link>

          <section className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-1 overflow-hidden">
            {/* 
               We simply render the MiniCalendar here. It has its own complex logic that is hard to inline.
               We trust it fits relatively well, or we accept a slight visual deviation in favor of functionality.
               We can try to override some of its styles via CSS if needed, but it's a Card itself.
             */}
            <div className="[&>div]:border-none [&>div]:bg-transparent [&>div]:shadow-none">
              <MiniCalendar />
            </div>
          </section>

          {/* Mapa Yah */}
          <section className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] border border-[#3A3A3A] rounded-2xl p-6 text-center animate-fade-in mb-8">
            <Map className="w-12 h-12 mx-auto text-[#EEEDE9] mb-4 opacity-80" />
            <h2 className="text-base font-semibold text-[#EEEDE9] mb-2">Mapa de como aproveitar melhor a Yah</h2>
            <p className="text-[13px] text-[#999] mb-4">Descubra todas as funcionalidades e otimize sua jornada</p>
            <button
              onClick={() => navigate("/explore-map")}
              className="bg-[#B6BC45] text-[#141414] font-semibold py-2.5 px-6 rounded-lg text-sm hover:scale-105 hover:shadow-[0_4px_16px_rgba(182,188,69,0.3)] transition-all duration-200"
            >
              Explorar Mapa
            </button>
          </section>

        </div>
      </div>
    </MinimalLayout>
  );
}
