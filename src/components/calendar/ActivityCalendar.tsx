import { useState, useEffect } from "react";
import { format, isSameDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CalendarHeader } from "./CalendarHeader";
import { CategoryFilters, CATEGORIES } from "./CategoryFilters";
import { MonthView } from "./CalendarViews/MonthView";
import { WeekView } from "./CalendarViews/WeekView";
import { DayView } from "./CalendarViews/DayView";
import { YearView } from "./CalendarViews/YearView";
import { ListView } from "./CalendarViews/ListView";
import { DayDrawer } from "./CalendarViews/DayDrawer";
import { ActivityReports } from "./CalendarReports/ActivityReports";
import { AddActivityDialog } from "./AddActivityDialog";
import { CerebroEvent } from "./types";

export function ActivityCalendar() {
  const { user } = useAuth();
  const [view, setView] = useState<"day" | "week" | "month" | "year">("month");
  const [displayMode, setDisplayMode] = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<CerebroEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CATEGORIES.map(c => c.id));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDayDrawer, setShowDayDrawer] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CerebroEvent | null>(null);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("eventos_do_cerebro")
        .select("*")
        .eq("user_id", user?.id)
        .order("data", { ascending: true });

      if (error) throw error;
      setEvents(data as any as CerebroEvent[]);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast.error("Erro ao carregar eventos");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter(e => selectedCategories.includes(e.categoria));

  const handleToggleStatus = async (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;

    const newStatus = event.status === "Concluído" ? "Pendente" : "Concluído";

    try {
      const { error } = await (supabase as any)
        .from("eventos_do_cerebro")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setEvents(events.map((e) => (e.id === id ? { ...e, status: newStatus as any } : e)));
      toast.success(`Status atualizado para ${newStatus}`);
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("eventos_do_cerebro")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setEvents(events.filter((e) => e.id !== id));
      toast.success("Evento removido");
    } catch (error: any) {
      toast.error("Erro ao remover evento");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedDateEvents = selectedDate
    ? filteredEvents.filter(e => isSameDay(new Date(e.data + 'T12:00:00'), selectedDate))
    : [];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="order-1">
        <CalendarHeader
          currentMonth={currentDate}
          view={view}
          onViewChange={setView}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          onAddEvent={() => setShowAddDialog(true)}
        />
      </div>

      <div className="order-2 flex-1">
        {displayMode === "list" ? (
          <ListView
            date={currentDate}
            view={view}
            events={filteredEvents}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteEvent}
            onEdit={(e) => {
              setEditingEvent(e);
              setShowAddDialog(true);
            }}
          />
        ) : (
          <>
            {view === "month" && (
              <MonthView
                currentMonth={currentDate}
                events={filteredEvents}
                selectedDate={selectedDate}
                onSelectDay={(day) => {
                  setSelectedDate(day);
                  setShowDayDrawer(true);
                }}
              />
            )}
            {view === "week" && (
              <WeekView currentDate={currentDate} events={filteredEvents} />
            )}
            {view === "day" && (
              <DayView date={selectedDate || new Date()} events={filteredEvents} />
            )}
            {view === "year" && (
              <YearView
                currentDate={currentDate}
                events={filteredEvents}
                onSelectMonth={(month) => {
                  setCurrentDate(month);
                  setView("month");
                }}
              />
            )}
          </>
        )}
      </div>

      <div className="order-3 mt-12 lg:order-2 lg:mb-8">
        <CategoryFilters
          selectedCategories={selectedCategories}
          onChange={setSelectedCategories}
        />
      </div>

      <div className="order-4">
        <ActivityReports
          date={selectedDate || new Date()}
          events={filteredEvents}
        />
      </div>

      <DayDrawer
        open={showDayDrawer}
        onOpenChange={setShowDayDrawer}
        date={selectedDate}
        events={selectedDateEvents}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDeleteEvent}
        onEdit={(e) => {
          setEditingEvent(e);
          setShowAddDialog(true);
          setShowDayDrawer(false);
        }}
      />

      <AddActivityDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingEvent(null);
        }}
        onAdd={fetchEvents}
        defaultDate={selectedDate || new Date()}
        editingEvent={editingEvent}
      />
    </div>
  );
}
