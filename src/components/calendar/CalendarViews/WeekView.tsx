import React, { useRef, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CerebroEvent, CATEGORY_COLORS } from "../types";

interface WeekViewProps {
    currentDate: Date;
    events: CerebroEvent[];
    onEdit: (event: CerebroEvent) => void;
}

export function WeekView({ currentDate, events, onEdit }: WeekViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const weekStart = startOfWeek(currentDate, { locale: ptBR });
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const hours = Array.from({ length: 24 }).map((_, i) => i);

    useEffect(() => {
        // Initial scroll to 8 AM
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 80 * 8;
        }

        // Scroll Sync Logic
        const body = scrollRef.current;
        const header = headerRef.current;

        if (!body || !header) return;

        let isSyncingHeader = false;
        let isSyncingBody = false;

        const syncHeader = () => {
            if (!isSyncingBody) {
                isSyncingHeader = true;
                header.scrollLeft = body.scrollLeft;
            }
            isSyncingBody = false;
        };

        const syncBody = () => {
            if (!isSyncingHeader) {
                isSyncingBody = true;
                body.scrollLeft = header.scrollLeft;
            }
            isSyncingHeader = false;
        };

        body.addEventListener("scroll", syncHeader);
        header.addEventListener("scroll", syncBody);

        return () => {
            body.removeEventListener("scroll", syncHeader);
            header.removeEventListener("scroll", syncBody);
        };
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
        <div className="bg-slate-900/40 md:border border-white/5 rounded-none md:rounded-3xl overflow-hidden h-[600px] flex flex-col md:shadow-2xl">
            {/* Header with day names */}
            <div ref={headerRef} className="overflow-x-auto scrollbar-hide border-b border-white/10 bg-white/10">
                <div className="grid grid-cols-[30px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] min-w-[600px] md:min-w-full">
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
                <div className="grid grid-cols-[30px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] min-h-[1920px] min-w-[600px] md:min-w-full">
                    {/* Time Sidebar */}
                    <div className="border-r border-white/5 bg-slate-950/20">
                        {hours.map(h => (
                            <div key={h} className="h-20 flex items-start justify-end pr-1 pt-1">
                                <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40">{String(h).padStart(2, '0')}</span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day) => {
                        // 1. Filter and prepare events for this day
                        const dayEvents = events
                            .filter(e => isSameDay(new Date(e.data + 'T12:00:00'), day))
                            .map(e => {
                                const [h, m] = (e.hora || "00:00").split(':').map(Number);
                                const start = h * 60 + m;
                                const duration = e.duracao || 60;
                                return { ...e, start, end: start + duration };
                            })
                            .sort((a, b) => a.start - b.start || (b.duracao || 60) - (a.duracao || 60));

                        // 2. Compute columns (packing)
                        const columns: number[] = [];
                        const withColIndex = dayEvents.map(event => {
                            let colIndex = columns.findIndex(colEnd => colEnd <= event.start);
                            if (colIndex === -1) {
                                colIndex = columns.length;
                                columns.push(event.end);
                            } else {
                                columns[colIndex] = event.end;
                            }
                            return { ...event, colIndex };
                        });

                        // 3. Render events with layout styles
                        return (
                            <div key={day.toISOString()} className="relative border-r border-white/[0.03] last:border-0 h-full">
                                {hours.map(h => (
                                    <div key={h} className="h-20 border-b border-white/[0.02]" />
                                ))}

                                {/* Events for this day */}
                                <div className="absolute inset-0 p-1">
                                    {withColIndex.map(event => {
                                        // Deck layout logic for Week View
                                        const colors = CATEGORY_COLORS[event.categoria] || CATEGORY_COLORS.Outro;
                                        return (
                                            <div
                                                key={event.id}
                                                className={cn(
                                                    "absolute rounded-xl border flex flex-col p-1.5 overflow-hidden shadow-lg transition-all duration-200 hover:scale-[1.05] cursor-pointer group hover:shadow-2xl hover:!z-[100]",
                                                    colors.bg,
                                                    colors.text,
                                                    "border-white/10"
                                                )}
                                                style={{
                                                    top: `${(event.start / 60) * 80}px`,
                                                    height: `${((event.duracao || 60) / 60) * 80}px`,
                                                    // Stacked layout for columns
                                                    left: `calc(2px + ${event.colIndex * 15}%)`,
                                                    width: `calc(95% - ${event.colIndex * 10}%)`,
                                                    zIndex: event.colIndex + 10
                                                }}
                                                onClick={() => onEdit(event)}
                                            >
                                                <div className="flex items-center gap-1 mb-0.5 shrink-0">
                                                    <div className={cn("w-1 h-1 rounded-full", colors.dot)} />
                                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-70 truncate">{event.categoria}</span>
                                                </div>
                                                <h4 className={cn(
                                                    "font-extrabold text-[9px] leading-tight truncate group-hover:text-white transition-colors",
                                                    event.status === "Concluído" && "line-through opacity-50"
                                                )}>{event.titulo}</h4>
                                                <span className="text-[7px] font-bold mt-auto opacity-60">{event.hora?.substring(0, 5)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
