import React, { useEffect, useRef, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CerebroEvent, CATEGORY_COLORS } from "../types";

interface DayViewProps {
    date: Date;
    events: CerebroEvent[];
    onEdit: (event: CerebroEvent) => void;
}

export function DayView({ date, events, onEdit }: DayViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const now = new Date();
    const isSelectedToday = isSameDay(date, now);

    const hours = Array.from({ length: 24 }).map((_, i) => i);

    useEffect(() => {
        if (isSelectedToday && scrollRef.current) {
            const currentHour = now.getHours();
            scrollRef.current.scrollTop = Math.max(0, currentHour * 80 - 100);
        }
    }, []);

    const positionedEvents = useMemo(() => {
        // 1. Filter and prepare events
        const dayEvents = events
            .filter((e) => isSameDay(new Date(e.data + 'T12:00:00'), date))
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

        // 3. Compute final layout (Stacked Deck Effect)
        return withColIndex.map(event => {
            // Find concurrent events
            const concurrent = withColIndex.filter(e =>
                Math.max(e.start, event.start) < Math.min(e.end, event.end)
            );
            const maxColIndex = Math.max(...concurrent.map(e => e.colIndex));

            // Stack offset calculation
            // We limit the offset so it doesn't push cards off-screen if there are too many
            const offsetStep = 18; // px
            const leftOffset = Math.min(event.colIndex * offsetStep, 100);

            return {
                ...event,
                style: {
                    top: `${(event.start / 60) * 80}px`,
                    height: `${((event.duracao || 60) / 60) * 80}px`,
                    // Deck layout: overlapping cards with slight indentation
                    left: `calc(12px + ${event.colIndex * 8}%)`,
                    width: `calc(90% - ${event.colIndex * 4}%)`, // Slight width reduction for depth effect
                    zIndex: event.colIndex + 10,
                }
            };
        });
    }, [events, date]);

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden h-[600px] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
                <h3 className="font-black text-sm uppercase tracking-widest text-white/70">
                    {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <div className="px-3 py-1 bg-primary/10 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">
                    {positionedEvents.length} Eventos
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto relative p-4 scrollbar-hide">
                {/* Hour markers */}
                {hours.map((h) => (
                    <div key={h} className="h-20 border-t border-white/[0.03] flex items-start -ml-2">
                        <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 ml-2 mt-1">
                            {String(h).padStart(2, '0')}:00
                        </span>
                    </div>
                ))}

                {/* Current time line */}
                {isSelectedToday && (
                    <div
                        className="absolute left-0 right-0 border-t-2 border-primary z-20 pointer-events-none flex items-center"
                        style={{ top: `${(now.getHours() * 80) + (now.getMinutes() / 60 * 80) + 16}px` }}
                    >
                        <div className="w-2 h-2 rounded-full bg-primary -ml-1 shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                        <div className="bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm ml-2">
                            {format(now, "HH:mm")}
                        </div>
                    </div>
                )}

                {/* Events */}
                <div className="absolute inset-x-4 top-4 bottom-4">
                    {positionedEvents.map((event) => {
                        const colors = CATEGORY_COLORS[event.categoria] || CATEGORY_COLORS.Outro;
                        return (
                            <div
                                key={event.id}
                                className={cn(
                                    "absolute rounded-2xl p-3 border transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:!z-[100]",
                                    colors.bg,
                                    colors.text,
                                    "border-white/10"
                                )}
                                style={event.style}
                                onClick={() => onEdit(event)}
                            >
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", colors.dot)} />
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-80 truncate">{event.categoria}</span>
                                    </div>
                                    <h4 className="font-bold text-xs leading-tight group-hover:text-white transition-colors truncate">{event.titulo}</h4>
                                    <div className="mt-auto flex items-center justify-between opacity-60 text-[9px] font-bold">
                                        <span>{event.hora?.substring(0, 5)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
