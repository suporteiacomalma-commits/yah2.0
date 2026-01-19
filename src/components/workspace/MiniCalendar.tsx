import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Plus, Loader2, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ptBR } from "date-fns/locale";
import { isSameDay, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  content: "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
  meeting: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
  deadline: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
  reminder: "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]",
  task: "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]",
};

export function MiniCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("calendar_activities")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching for mini calendar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isActivityOnDay = (activity: any, day: Date) => {
    if (!day) return false;
    const activityDate = new Date(activity.date);

    // Match exact date
    if (isSameDay(activityDate, day)) return true;

    // Pattern matching for recurring tasks
    try {
      const meta = JSON.parse(activity.description || "{}");
      if (meta.isRecurring) {
        // Ignore if day is before the start date
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const activityStart = new Date(activityDate);
        activityStart.setHours(0, 0, 0, 0);

        if (dayStart < activityStart) return false;

        if (meta.frequency === 'daily') return true;
        if (meta.frequency === 'weekly') {
          return meta.days.includes(day.getDay());
        }
      }
    } catch (e) {
      // Not recurring
    }
    return false;
  };

  const selectedDayActivities = activities.filter(a =>
    date && isActivityOnDay(a, date)
  );

  const modifiers = {
    hasActivity: (day: Date) => activities.some(a => isActivityOnDay(a, day))
  };

  return (
    <Card className="bg-[#0A0A0B]/80 backdrop-blur-2xl border-white/5 overflow-hidden flex flex-col h-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500 hover:border-white/10 group">
      <CardHeader className="pb-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/calendar")}
            className="flex items-center gap-2 transition-all duration-300 hover:translate-x-1"
          >
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                Calendário Vivo
                <Sparkles className="w-3 h-3 text-primary/50" />
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ritmo de Criação</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/assistant")}
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
                  Atividades • {date ? format(date, "dd/MM") : ""}
                </h4>
                <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-primary">
                  {selectedDayActivities.length} total
                </div>
              </div>

              <div className="space-y-2.5 max-h-[300px] lg:max-h-[340px] overflow-y-auto pr-1 custom-scrollbar flex-1">
                {selectedDayActivities.length > 0 ? (
                  selectedDayActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 cursor-pointer relative overflow-hidden"
                      onClick={() => navigate("/calendar")}
                    >
                      {/* Interactive hover glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.02] to-primary/0 opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-1000" />

                      <div className={cn("w-1 h-full absolute left-0 top-0", categoryColors[activity.category]?.split(' ')[0] || "bg-primary")} />

                      <div className="flex-1 min-w-0 z-10">
                        <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{activity.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">
                            {activity.category === 'content' ? 'Postagem' :
                              activity.category === 'meeting' ? 'Reunião' :
                                activity.category === 'deadline' ? 'Prazo' : 'Tarefa'}
                          </p>
                          <div className="w-1 h-1 rounded-full bg-white/10" />
                          <p className="text-[10px] text-muted-foreground/60">
                            {format(new Date(activity.date), "HH:mm")}
                          </p>
                        </div>
                      </div>

                      <div className="z-10">
                        {activity.status === 'completed' ? (
                          <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-white/5 text-muted-foreground/50 border border-white/10 group-hover:border-primary/30 group-hover:text-primary transition-all">
                            <Circle className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
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
    </Card>
  );
}
