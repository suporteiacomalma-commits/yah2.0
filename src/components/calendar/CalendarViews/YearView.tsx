import React from "react";
import { format, startOfYear, addMonths, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CerebroEvent, CATEGORY_COLORS } from "../types";

interface YearViewProps {
    currentDate: Date;
    events: CerebroEvent[];
    onSelectMonth: (month: Date) => void;
}

export function YearView({ currentDate, events, onSelectMonth }: YearViewProps) {
    const yearStart = startOfYear(currentDate);
    const months = Array.from({ length: 12 }).map((_, i) => addMonths(yearStart, i));

    const getEventsForDay = (day: Date) => {
        return events.filter((e) => isSameDay(new Date(e.data), day));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {months.map((month) => {
                const monthStart = startOfMonth(month);
                const monthEnd = endOfMonth(month);
                const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

                // Padding for the first day of the month
                const pad = monthStart.getDay();

                return (
                    <div
                        key={month.toISOString()}
                        onClick={() => onSelectMonth(monthStart)}
                        className="bg-slate-900/40 border border-white/5 rounded-[32px] p-5 cursor-pointer hover:bg-white/5 transition-all group hover:scale-[1.02] shadow-xl"
                    >
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 group-hover:text-primary transition-colors">
                            {format(month, "MMMM", { locale: ptBR })}
                        </h4>

                        <div className="grid grid-cols-7 gap-1">
                            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                                <div key={i} className="text-[8px] font-black text-white/20 text-center mb-1">{d}</div>
                            ))}

                            {Array.from({ length: pad }).map((_, i) => (
                                <div key={`pad-${i}`} className="aspect-square" />
                            ))}

                            {days.map((day) => {
                                const dayEvents = getEventsForDay(day);
                                const hasEvents = dayEvents.length > 0;

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className="aspect-square flex flex-col items-center justify-center relative"
                                    >
                                        <span className={cn(
                                            "text-[9px] font-bold z-10",
                                            isSameDay(day, new Date()) ? "text-primary" : "text-white/40"
                                        )}>
                                            {format(day, "d")}
                                        </span>

                                        {hasEvents && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-lg opacity-10",
                                                    CATEGORY_COLORS[dayEvents[0].categoria]?.bg || "bg-primary"
                                                )} />
                                                {/* Load dots */}
                                                <div className="absolute -bottom-1 flex gap-0.5">
                                                    {dayEvents.slice(0, 3).map(e => (
                                                        <div key={e.id} className={cn("w-0.5 h-0.5 rounded-full", CATEGORY_COLORS[e.categoria]?.dot || "bg-primary")} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
