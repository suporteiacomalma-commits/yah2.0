import React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CerebroEvent, CATEGORY_COLORS } from "../types";

interface MonthViewProps {
    currentMonth: Date;
    events: CerebroEvent[];
    onSelectDay: (day: Date) => void;
    selectedDate: Date | null;
}

export function MonthView({ currentMonth, events, onSelectDay, selectedDate }: MonthViewProps) {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getEventsForDay = (day: Date) => {
        return events.filter((e) => isSameDay(new Date(e.data + 'T12:00:00'), day));
    };

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-white/5">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <div
                        key={day}
                        className="py-4 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 md:auto-rows-[120px]">
                {days.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDay = isToday(day);
                    const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onSelectDay(day)}
                            className={cn(
                                "min-h-[100px] md:min-h-0 p-2 border-r border-b border-white/5 transition-all cursor-pointer group hover:bg-white/[0.02]",
                                !isCurrentMonth && "opacity-20 bg-slate-950/20",
                                isSelected && "bg-primary/5",
                                (idx + 1) % 7 === 0 && "border-r-0"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span
                                    className={cn(
                                        "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg transition-all",
                                        isTodayDay ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground group-hover:text-white"
                                    )}
                                >
                                    {format(day, "d")}
                                </span>
                            </div>

                            <div className="space-y-0.5 md:space-y-1">
                                {dayEvents.slice(0, window.innerWidth < 768 ? 2 : 3).map((event) => {
                                    const colors = CATEGORY_COLORS[event.categoria] || CATEGORY_COLORS.Outro;
                                    return (
                                        <div
                                            key={event.id}
                                            className={cn(
                                                "px-1.5 md:px-2 py-0.5 md:py-1 rounded-[4px] md:rounded-md text-[8px] md:text-[9px] font-bold truncate transition-all flex items-center gap-1 md:gap-1.5",
                                                colors.bg,
                                                colors.text,
                                                "border border-white/5 shadow-sm",
                                                event.status === "Concluído" && "opacity-40 grayscale-[0.5]"
                                            )}
                                        >
                                            <div className={cn("w-1 h-1 rounded-full shrink-0", colors.dot)} />
                                            <span className={cn(
                                                "truncate",
                                                event.status === "Concluído" && "line-through decoration-current decoration-1"
                                            )}>{event.titulo}</span>
                                        </div>
                                    );
                                })}
                                {dayEvents.length > (window.innerWidth < 768 ? 2 : 3) && (
                                    <div className="text-[7px] md:text-[9px] font-black text-muted-foreground pl-1 md:pl-2 uppercase tracking-tighter">
                                        + {dayEvents.length - (window.innerWidth < 768 ? 2 : 3)}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
