import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/hooks/useBrand";
import { useProfile } from "@/hooks/useProfile";
import { phases } from "@/lib/phases";
import { Loader2, Mic, Lightbulb, Check, Map, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MiniCalendar } from "@/components/workspace/MiniCalendar";
import { cn } from "@/lib/utils";

// Phases to display in the dashboard (skipping 5 and 9 as per design/existing logic)
const DASHBOARD_PHASE_IDS = [1, 2, 3, 4, 6, 7, 8];

export default function Dashboard() {
  const { brand, isLoading: brandLoading } = useBrand();
  const { profile, isLoading: profileLoading } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [todaysTasks, setTodaysTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

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
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("eventos_do_cerebro")
        .select("*")
        .eq("user_id", user?.id)
        .eq("data", today)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTodaysTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setTasksLoading(false);
    }
  };

  const toggleTask = async (task: any) => {
    try {
      const newStatus = task.status === "Concluído" ? "Pendente" : "Concluído";
      const { error } = await supabase
        .from("eventos_do_cerebro")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) throw error;

      // Optimistic update
      setTodaysTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ));

      if (newStatus === "Concluído") {
        toast.success("Tarefa concluída!");
      }
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleContinueJourney = () => {
    if (brand?.current_phase) {
      navigate(`/phase/${brand.current_phase}`);
    } else {
      navigate("/phase/1");
    }
  };

  if (brandLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#B6BC45]" />
      </div>
    );
  }

  const currentPhaseId = brand?.current_phase || 1;
  const completedPhases = brand?.phases_completed || [];

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
                Bom te ver por aqui, <span className="text-[#B6BC45]">{profile?.full_name?.split(' ')[0] || "Criador"}</span>! ✨
              </h1>
              <p className="text-sm text-[#999]">Vamos continuar construindo sua presença digital</p>
            </div>
            <button
              onClick={handleContinueJourney}
              className="w-full bg-gradient-to-br from-[#B6BC45] to-[#9DA139] text-[#141414] font-semibold py-3.5 px-6 rounded-xl shadow-[0_4px_12px_rgba(182,188,69,0.2)] hover:shadow-[0_6px_16px_rgba(182,188,69,0.3)] hover:-translate-y-0.5 transition-all duration-200 text-[15px]"
            >
              Continuar de onde parei (Fase {currentPhaseId})
            </button>
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
          <section className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#EEEDE9]">Seu dia, hoje</h2>
              <span className="text-xs text-[#999] font-medium">{format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>

            <div className="space-y-0.5">
              {tasksLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[#B6BC45]" />
                </div>
              ) : todaysTasks.length > 0 ? (
                todaysTasks.map((task) => {
                  const isCompleted = task.status === "Concluído";
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task)}
                      className={cn(
                        "flex items-center py-3 border-b border-[#2A2A2A] cursor-pointer transition-all active:scale-[0.99]",
                        "last:border-0 hover:bg-white/[0.02] px-2 -mx-2 rounded-lg",
                        isCompleted && "opacity-50"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 min-w-[20px] border-2 rounded-md mr-3 flex items-center justify-center transition-colors duration-200",
                        isCompleted ? "bg-[#B6BC45] border-[#B6BC45]" : "border-[#3A3A3A]"
                      )}>
                        {isCompleted && <Check className="w-3.5 h-3.5 text-[#141414] stroke-[3]" />}
                      </div>
                      <span className={cn(
                        "text-sm text-[#EEEDE9] flex-1 line-clamp-2",
                        isCompleted && "line-through text-[#999]"
                      )}>
                        {task.titulo}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[#999] italic py-2 text-center">Nenhuma tarefa para hoje.</p>
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
                const isLocked = !isCompleted && !isCurrent && phaseId > currentPhaseId;

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
                              Ver documento
                            </button>
                          ) : (
                            <button className="flex-1 bg-[#B6BC45] border border-[#B6BC45] text-[#141414] text-[13px] py-2.5 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold">
                              {isCurrent ? "Continuar" : "Começar"}
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

          {/* Hoje você pode falar - Static/Placeholder as per layout request */}
          <section className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-[#EEEDE9] mb-4">Hoje você pode falar no digital sobre:</h2>
            <div className="space-y-4">
              <div className="border-b border-[#2A2A2A] pb-4 last:border-0 last:pb-0">
                <div className="text-sm font-semibold text-[#B6BC45] mb-1">Feed</div>
                <div className="text-[13px] text-[#999]">Intenção: Educar | Tema: Como estruturar processos criativos</div>
              </div>
              <div className="border-b border-[#2A2A2A] pb-4 last:border-0 last:pb-0">
                <div className="text-sm font-semibold text-[#B6BC45] mb-1">Stories</div>
                <div className="text-[13px] text-[#999]">Intenção: Conectar | Tema: Bastidores da criação de conteúdo</div>
              </div>
            </div>
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
              onClick={() => toast("Mapa Yah em desenvolvimento", { description: "Em breve você terá um guia completo!" })}
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
