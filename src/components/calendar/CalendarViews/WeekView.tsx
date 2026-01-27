import React, { useRef, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CerebroEvent, CATEGORY_COLORS } from "../types";

interface WeekViewProps {
    currentDate: Date;
    events: CerebroEvent[];
}

export function WeekView({ currentDate, events }: WeekViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const weekStart = startOfWeek(currentDate, { locale: ptBR });
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const hours = Array.from({ length: 24 }).map((_, i) => i);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 80 * 8; // Scroll to 8 AM
        }
    }, []);

    const getEventStyle = (event: CerebroEvent) => {
        if (!event.hora) return { top: 0, height: 60 };
        const [h, m] = event.hora.split(':').map(Number);
        const duration = event.duracao || 60;
        return {
            top: `${(h * 80) + (m / 60 * 80)}px`,
            height: `${(duration / 60) * 80}px`
        };
    };

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden h-[600px] flex flex-col shadow-2xl">
            {/* Header with day names */}
            <div className="overflow-x-auto scrollbar-hide border-b border-white/10 bg-white/10">
                <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] min-w-[800px] md:min-w-full">
                    <div className="border-r border-white/5" />
                    {weekDays.map((day) => (
                        <div key={day.toISOString()} className="py-4 text-center border-r border-white/5 last:border-0">
                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
                                {format(day, "EEE", { locale: ptBR })}
                            </div>
                            <div className={cn(
                                "text-sm font-black inline-flex items-center justify-center w-7 h-7 rounded-lg",
                                isSameDay(day, new Date()) ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/70"
                            )}>
                                {format(day, "d")}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main timeline grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto relative p-0 overflow-x-auto scrollbar-hide">
                <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] min-h-[1920px] min-w-[800px] md:min-w-full">
                    {/* Time Sidebar */}
                    <div className="border-r border-white/5 bg-slate-950/20">
                        {hours.map(h => (
                            <div key={h} className="h-20 flex items-start justify-center pt-1">
                                <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40">{String(h).padStart(2, '0')}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day) => (
                        <div key={day.toISOString()} className="relative border-r border-white/[0.03] last:border-0 h-full">
                            {hours.map(h => (
                                <div key={h} className="h-20 border-b border-white/[0.02]" />
                            ))}

                            {/* Events for this day */}
                            <div className="absolute inset-0 p-1">
                                {events
                                    .filter(e => isSameDay(new Date(e.data + 'T12:00:00'), day))
                                    .map(event => {
                                        const colors = CATEGORY_COLORS[event.categoria] || CATEGORY_COLORS.Outro;
                                        const style = getEventStyle(event);
                                        return (
                                            <div
                                                key={event.id}
                                                className={cn(
                                                    "absolute inset-x-1.5 rounded-xl border flex flex-col p-2 overflow-hidden shadow-lg transition-all hover:scale-[1.05] cursor-pointer group",
                                                    colors.bg,
                                                    colors.text,
                                                    "border-white/5"
                                                )}
                                                style={style}
                                            >
                                                <div className="flex items-center gap-1 mb-0.5 shrink-0">
                                                    <div className={cn("w-1 h-1 rounded-full", colors.dot)} />
                                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-70 truncate">{event.categoria}</span>
                                                </div>
                                                <h4 className="font-extrabold text-[10px] leading-tight truncate group-hover:text-white transition-colors">{event.titulo}</h4>
                                                <span className="text-[8px] font-bold mt-auto opacity-60">{event.hora?.substring(0, 5)}</span>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
