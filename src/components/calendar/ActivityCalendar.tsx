import { useState, useEffect } from "react";
import { format, isSameDay, startOfMonth, startOfYear, endOfYear, addYears, subYears, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
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
import { expandRecurringEvents } from "./utils/recurrenceUtils";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export function ActivityCalendar() {
  const { user } = useAuth();
  const location = useLocation();
  const [view, setView] = useState<"day" | "week" | "month" | "year">("month");
  const [displayMode, setDisplayMode] = useState<"calendar" | "list">("calendar");

  // Initialize from navigation state if available
  const initialDate = location.state?.selectedDate ? new Date(location.state.selectedDate) : new Date();

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [events, setEvents] = useState<CerebroEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CATEGORIES.map(c => c.id));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDayDrawer, setShowDayDrawer] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CerebroEvent | null>(null);

  // New state for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    eventId: string;
    eventDate: string;
    eventTitle: string;
  }>({ open: false, eventId: "", eventDate: "", eventTitle: "" });

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

  // Expand events to show recurring instances
  const expandedEvents = expandRecurringEvents(
    events,
    subYears(startOfYear(currentDate), 1),
    addYears(endOfYear(currentDate), 1)
  );

  const filteredEvents = expandedEvents.filter(e => selectedCategories.includes(e.categoria));

  const handlePrev = () => {
    switch (view) {
      case "day": setCurrentDate(prev => subDays(prev, 1)); break;
      case "week": setCurrentDate(prev => subWeeks(prev, 1)); break;
      case "month": setCurrentDate(prev => subMonths(prev, 1)); break;
      case "year": setCurrentDate(prev => subYears(prev, 1)); break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case "day": setCurrentDate(prev => addDays(prev, 1)); break;
      case "week": setCurrentDate(prev => addWeeks(prev, 1)); break;
      case "month": setCurrentDate(prev => addMonths(prev, 1)); break;
      case "year": setCurrentDate(prev => addYears(prev, 1)); break;
    }
  };

  const handleToggleStatus = async (id: string) => {
    const isVirtual = id.includes("-virtual-");
    const realId = isVirtual ? id.split("-virtual-")[0] : id;
    const masterEvent = events.find((e) => e.id === realId);
    if (!masterEvent) return;

    // Determine the date of the specific instance toggle
    const instanceEvent = isVirtual
      ? expandedEvents.find(e => e.id === id)
      : masterEvent;

    if (!instanceEvent) return;
    const eventDate = instanceEvent.data;

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

        setEvents(events.map((e) => (e.id === realId ? { ...e, concluidos: newCompletions } : e)));
        toast.success(isCurrentlyCompleted ? "Ocorrência marcada como pendente" : "Ocorrência concluída");
      } catch (error: any) {
        toast.error("Erro ao atualizar status da ocorrência");
      }
    } else {
      // Normal non-recurring toggle
      const newStatus = masterEvent.status === "Concluído" ? "Pendente" : "Concluído";
      try {
        const { error } = await (supabase as any)
          .from("eventos_do_cerebro")
          .update({ status: newStatus })
          .eq("id", realId);

        if (error) throw error;

        setEvents(events.map((e) => (e.id === realId ? { ...e, status: newStatus as any } : e)));
        toast.success(`Status atualizado para ${newStatus}`);
      } catch (error: any) {
        toast.error("Erro ao atualizar status");
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const isVirtual = id.includes("-virtual-");
    const realId = isVirtual ? id.split("-virtual-")[0] : id;
    const event = isVirtual
      ? expandedEvents.find(e => e.id === id)
      : events.find(e => e.id === id);

    if (!event) return;

    if (event.recorrencia !== "Nenhuma") {
      setDeleteConfirmation({
        open: true,
        eventId: id,
        eventDate: event.data,
        eventTitle: event.titulo
      });
      return;
    }

    performDelete(realId);
  };

  const performDelete = async (realId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("eventos_do_cerebro")
        .delete()
        .eq("id", realId);

      if (error) throw error;

      setEvents(events.filter((e) => e.id !== realId));
      toast.success("Evento removido");
    } catch (error: any) {
      toast.error("Erro ao remover evento");
    }
  };

  const handleConfirmDelete = async (mode: "instance" | "series") => {
    const { eventId, eventDate } = deleteConfirmation;
    const realId = eventId.includes("-virtual-") ? eventId.split("-virtual-")[0] : eventId;

    setDeleteConfirmation(prev => ({ ...prev, open: false }));

    if (mode === "series") {
      performDelete(realId);
    } else {
      const masterEvent = events.find(e => e.id === realId);
      if (!masterEvent) return;

      const currentExclusions = masterEvent.exclusoes || [];
      const newExclusions = [...currentExclusions, eventDate];

      try {
        const { error } = await (supabase as any)
          .from("eventos_do_cerebro")
          .update({ exclusoes: newExclusions })
          .eq("id", realId);

        if (error) throw error;

        setEvents(events.map(e => e.id === realId ? { ...e, exclusoes: newExclusions } : e));
        toast.success("Esta ocorrência foi removida");
      } catch (error: any) {
        toast.error("Erro ao remover ocorrência");
      }
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
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          onAddEvent={() => setShowAddDialog(true)}
          onPrev={handlePrev}
          onNext={handleNext}
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
              const realEvent = e.isVirtual ? events.find(master => master.id === e.id.split("-virtual-")[0]) || e : e;
              setEditingEvent(realEvent);
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
          const realEvent = e.isVirtual ? events.find(master => master.id === e.id.split("-virtual-")[0]) || e : e;
          setEditingEvent(realEvent);
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

      <DeleteConfirmationDialog
        open={deleteConfirmation.open}
        onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, open }))}
        onConfirm={handleConfirmDelete}
        eventTitle={deleteConfirmation.eventTitle}
      />
    </div>
  );
}
