import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActivityList } from "./ActivityList";
import { ActivityFilters } from "./ActivityFilters";
import { AddActivityDialog } from "./AddActivityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Activity {
  id: string;
  title: string;
  description?: string;
  date: Date;
  category: "content" | "meeting" | "deadline" | "reminder" | "task";
  status: "pending" | "completed" | "in_progress";
  priority: "low" | "medium" | "high";
}

const categoryColors: Record<Activity["category"], string> = {
  content: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]",
  meeting: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]",
  deadline: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]",
  reminder: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]",
  task: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]",
};

export function ActivityCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filters, setFilters] = useState({
    category: "all" as string,
    status: "all" as string,
    priority: "all" as string,
  });

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

      const formattedActivities: Activity[] = data.map((item: any) => ({
        ...item,
        date: new Date(item.date),
      }));

      setActivities(formattedActivities);
    } catch (error: any) {
      console.error("Error fetching activities:", error);
      toast.error("Erro ao carregar atividades");
    } finally {
      setIsLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredActivities = activities.filter((activity) => {
    if (filters.category !== "all" && activity.category !== filters.category) return false;
    if (filters.status !== "all" && activity.status !== filters.status) return false;
    if (filters.priority !== "all" && activity.priority !== filters.priority) return false;
    return true;
  });

  const selectedDateActivities = selectedDate
    ? filteredActivities.filter((a) => isSameDay(a.date, selectedDate))
    : filteredActivities;

  const getActivitiesForDay = (day: Date) => {
    return filteredActivities.filter((a) => isSameDay(a.date, day));
  };

  const handleAddActivity = async (newActivity: Omit<Activity, "id">) => {
    try {
      const { data, error } = await supabase
        .from("calendar_activities")
        .insert({
          ...newActivity,
          user_id: user?.id,
          date: newActivity.date.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const addedActivity = { ...data, date: new Date(data.date) } as Activity;
      setActivities([...activities, addedActivity]);
      setShowAddDialog(false);
      toast.success("Atividade adicionada!");
    } catch (error: any) {
      toast.error("Erro ao adicionar atividade");
    }
  };

  const handleToggleStatus = async (id: string) => {
    const activity = activities.find((a) => a.id === id);
    if (!activity) return;

    const newStatus = activity.status === "completed" ? "pending" : "completed";

    try {
      const { error } = await supabase
        .from("calendar_activities")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setActivities(
        activities.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      const { error } = await supabase
        .from("calendar_activities")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setActivities(activities.filter((a) => a.id !== id));
      toast.success("Atividade removida");
    } catch (error: any) {
      toast.error("Erro ao remover atividade");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Calendar Side */}
      <div className="lg:w-3/5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Calendário Central</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-xl border border-white/5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="hover:bg-primary/20 hover:text-primary transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="hover:bg-primary/20 hover:text-primary transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Calendar Box */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl">
          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {days.map((day) => {
              const dayActivities = getActivitiesForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-300 relative group",
                    "hover:bg-white/5 hover:scale-105 active:scale-95",
                    isTodayDay && "bg-primary/5 text-primary border border-primary/20",
                    isSelected ? "bg-primary text-primary-foreground font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] border-transparent" : "text-foreground/80 border border-transparent"
                  )}
                >
                  <span className="text-sm z-10">{format(day, "d")}</span>

                  {dayActivities.length > 0 && (
                    <div className="absolute bottom-2 flex gap-1 justify-center z-10">
                      {dayActivities.slice(0, 3).map((activity) => (
                        <div
                          key={activity.id}
                          className={cn(
                            "w-1 h-1 rounded-full",
                            categoryColors[activity.category]?.split(' ')[0] || "bg-primary"
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Hover effect glow */}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 rounded-2xl transition-all duration-300" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
          {Object.entries(categoryColors).map(([category, color]) => (
            <div key={category} className="flex items-center gap-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
              <span className="text-xs text-muted-foreground capitalize">
                {category === "content" && "Conteúdo"}
                {category === "meeting" && "Reunião"}
                {category === "deadline" && "Prazo"}
                {category === "reminder" && "Lembrete"}
                {category === "task" && "Tarefa"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Activities Side */}
      <div className="lg:w-1/2 flex flex-col bg-muted/30 rounded-xl p-4">
        {/* Activities Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                : "Todas as atividades"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedDateActivities.length} atividade
              {selectedDateActivities.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-muted")}
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="gradient-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <ActivityFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearDate={() => setSelectedDate(null)}
            hasDateFilter={!!selectedDate}
          />
        )}

        {/* Activities List */}
        <ActivityList
          activities={selectedDateActivities}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteActivity}
        />
      </div>

      {/* Add Activity Dialog */}
      <AddActivityDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddActivity}
        defaultDate={selectedDate || new Date()}
      />
    </div>
  );
}
