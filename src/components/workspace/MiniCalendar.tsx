import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Plus, Loader2, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ptBR } from "date-fns/locale";
import { isSameDay, format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CerebroEvent, CATEGORY_COLORS, EventCategory } from "../calendar/types";
import { CATEGORIES } from "../calendar/CategoryFilters";
import { expandRecurringEvents } from "../calendar/utils/recurrenceUtils";
import { toast } from "sonner";
import { AddActivityDialog } from "../calendar/AddActivityDialog";

export function MiniCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activities, setActivities] = useState<CerebroEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CerebroEvent | null>(null);

  useEffect(() => {
    if (user) {
      fetchActivities();

      // Subscribe to realtime changes for tasks
      const channel = supabase
        .channel('minicalendar-tasks')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'eventos_do_cerebro', filter: `user_id=eq.${user.id}` },
          () => fetchActivities()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("eventos_do_cerebro")
        .select("*")
        .eq("user_id", user?.id)
        .order("data", { ascending: true });

      if (error) throw error;
      setActivities((data as any) || []);
    } catch (error) {
      console.error("Error fetching for mini calendar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, eventDate: string) => {
    const isVirtual = id.includes("-virtual-");
    const realId = isVirtual ? id.split("-virtual-")[0] : id;
    const masterEvent = activities.find((e) => e.id === realId);
    if (!masterEvent) return;

    if (masterEvent.recorrencia !== "Nenhuma") {
      const currentCompletions = masterEvent.concluidos || [];
      const isCurrentlyCompleted = currentCompletions.includes(eventDate);
      const newCompletions = isCurrentlyCompleted
        ? currentCompletions.filter(d => d !== eventDate)
        : [...currentCompletions, eventDate];

      try {
        const { error } = await (supabase as any)
          .from("eventos_do_cerebro")
          .update({ concluidos: newCompletions })
          .eq("id", realId);

        if (error) throw error;

        setActivities(activities.map((e) => (e.id === realId ? { ...e, concluidos: newCompletions } : e)));
        toast.success(isCurrentlyCompleted ? "Ocorrência marcada como pendente" : "Missão cumprida!");
      } catch (error: any) {
        toast.error("Erro ao atualizar status da ocorrência");
      }
    } else {
      const newStatus = masterEvent.status === "Concluído" ? "Pendente" : "Concluído";
      try {
        const { error } = await (supabase as any)
          .from("eventos_do_cerebro")
          .update({ status: newStatus })
          .eq("id", realId);

        if (error) throw error;

        setActivities(activities.map((e) => (e.id === realId ? { ...e, status: newStatus as any } : e)));
        toast.success(newStatus === "Concluído" ? "Missão cumprida!" : "Status atualizado para Pendente");
      } catch (error: any) {
        toast.error("Erro ao atualizar status");
      }
    }
  };

  // Expand recurring events for the current month view (and surrounding for safety)
  const currentMonthStart = startOfMonth(date || new Date());
  const expandedActivities = expandRecurringEvents(
    activities,
    subMonths(currentMonthStart, 1),
    addMonths(currentMonthStart, 2)
  );

  const validCategories = CATEGORIES.map(c => c.id);

  const selectedDayActivities = expandedActivities.filter(a =>
    date && isSameDay(new Date(a.data + 'T12:00:00'), date) && validCategories.includes(a.categoria)
  );

  const modifiers = {
    hasActivity: (day: Date) => expandedActivities.some(a =>
      isSameDay(new Date(a.data + 'T12:00:00'), day) && validCategories.includes(a.categoria)
    )
  };

  return (
    <Card className="bg-[#0A0A0B]/80 backdrop-blur-2xl border-white/5 overflow-hidden flex flex-col h-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500 hover:border-white/10 group">
      <CardHeader className="pb-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/calendar", { state: { selectedDate: date } })}
            className="flex items-center gap-2 transition-all duration-300 hover:translate-x-1"
          >
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 text-left">
                Calendário Vivo
                <Sparkles className="w-3 h-3 text-primary/50" />
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-left">Ritmo de Criação</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/calendar", { state: { selectedDate: date } })}
            className="w-8 h-8 rounded-xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300"
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-[55%] space-y-4">
              <div className="relative p-1 rounded-2xl bg-white/[0.02] border border-white/5">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  modifiers={modifiers}
                  modifiersClassNames={{
                    hasActivity: "relative after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full after:shadow-[0_0_5px_rgba(var(--primary),0.8)]"
                  }}
                  className="rounded-xl w-full"
                  classNames={{
                    months: "w-full",
                    month: "w-full space-y-4",
                    day_selected: "bg-primary text-primary-foreground font-bold shadow-[0_0_20px_rgba(var(--primary),0.4)] rounded-xl",
                    day_today: "bg-white/5 text-primary font-bold border border-primary/20 rounded-xl",
                    table: "w-full border-collapse space-y-2",
                    head_row: "flex w-full mt-2",
                    head_cell: "text-muted-foreground rounded-md flex-1 font-bold text-[0.7rem] uppercase tracking-tighter opacity-50",
                    row: "flex w-full mt-2",
                    cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1",
                    day: cn(
                      "h-11 w-full p-0 font-medium aria-selected:opacity-100 transition-all duration-300 hover:bg-white/10 rounded-xl",
                      "flex items-center justify-center"
                    ),
                  }}
                />
              </div>
            </div>

            <div className="lg:w-[45%] flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                  <div className="w-1 h-3 bg-primary rounded-full" />
                  Visão do Dia: • {date ? format(date, "dd/MM") : ""}
                </h4>
                <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-primary">
                  {selectedDayActivities.length} total
                </div>
              </div>

              <div className="space-y-2.5 max-h-[300px] lg:max-h-[340px] overflow-y-auto pr-1 custom-scrollbar flex-1">
                {selectedDayActivities.length > 0 ? (
                  selectedDayActivities.map((activity) => {
                    const colors = CATEGORY_COLORS[activity.categoria] || CATEGORY_COLORS.Outro;
                    return (
                      <div
                        key={activity.id}
                        className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 cursor-pointer relative overflow-hidden"
                        onClick={() => {
                          // Find master event if it's a recurrence instance
                          const realEvent = activity.isVirtual
                            ? activities.find(master => master.id === activity.id.split("-virtual-")[0]) || activity
                            : activity;

                          setEditingEvent(realEvent);
                          setShowAddDialog(true);
                        }}
                      >
                        {/* Interactive hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.02] to-primary/0 opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-1000" />

                        <div className={cn("w-1 h-full absolute left-0 top-0", colors.dot)} />

                        <div className="flex-1 min-w-0 z-10">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors text-left">{activity.titulo}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">
                              {activity.categoria}
                            </p>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <p className="text-[10px] text-muted-foreground/60">
                              {activity.hora?.substring(0, 5) || "--:--"}
                            </p>
                          </div>
                        </div>

                        <div
                          className="z-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(activity.id, activity.data);
                          }}
                        >
                          {activity.status === 'Concluído' ? (
                            <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 hover:scale-110 active:scale-90 transition-all">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-lg bg-white/5 text-muted-foreground/50 border border-white/10 group-hover:border-primary/30 group-hover:text-primary hover:scale-110 active:scale-90 transition-all">
                              <Circle className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center flex flex-col items-center justify-center h-full gap-2 rounded-2xl border border-dashed border-white/5 bg-white/[0.01]">
                    <div className="p-3 rounded-full bg-white/[0.02] text-muted-foreground/20">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <p className="text-[11px] text-muted-foreground/40 font-medium italic">Dia livre para criar coisas incríveis.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--primary), 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--primary), 0.4);
        }
      `}} />

      <AddActivityDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingEvent(null);
        }}
        onAdd={fetchActivities}
        defaultDate={date || new Date()}
        editingEvent={editingEvent}
      />
    </Card>
  );
}

