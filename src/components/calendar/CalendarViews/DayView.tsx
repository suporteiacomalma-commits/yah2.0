import React, { useEffect, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CerebroEvent, CATEGORY_COLORS } from "../types";

interface DayViewProps {
    date: Date;
    events: CerebroEvent[];
}

export function DayView({ date, events }: DayViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const now = new Date();
    const isSelectedToday = isSameDay(date, now);

    const dayEvents = events.filter((e) => isSameDay(new Date(e.data + 'T12:00:00'), date));

    const hours = Array.from({ length: 24 }).map((_, i) => i);

    useEffect(() => {
        if (isSelectedToday && scrollRef.current) {
            const currentHour = now.getHours();
            scrollRef.current.scrollTop = Math.max(0, currentHour * 80 - 100);
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
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
                <h3 className="font-black text-sm uppercase tracking-widest text-white/70">
                    {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <div className="px-3 py-1 bg-primary/10 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">
                    {dayEvents.length} Eventos
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
                    {dayEvents.map((event) => {
                        const colors = CATEGORY_COLORS[event.categoria] || CATEGORY_COLORS.Outro;
                        const style = getEventStyle(event);
                        return (
                            <div
                                key={event.id}
                                className={cn(
                                    "absolute left-16 right-4 rounded-2xl p-4 border transition-all hover:scale-[1.02] cursor-pointer group shadow-xl",
                                    colors.bg,
                                    colors.text,
                                    "border-white/5"
                                )}
                                style={style}
                            >
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={cn("w-2 h-2 rounded-full", colors.dot)} />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{event.categoria}</span>
                                    </div>
                                    <h4 className="font-bold text-sm leading-tight group-hover:text-white transition-colors truncate">{event.titulo}</h4>
                                    <div className="mt-auto flex items-center justify-between opacity-60 text-[10px] font-bold">
                                        <span>{event.hora?.substring(0, 5)} {event.duracao ? `(${event.duracao}min)` : ''}</span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[8px] border",
                                            event.status === 'Concluído' ? "bg-green-500/20 text-green-400 border-green-500/20" : "bg-white/5 text-muted-foreground border-white/10"
                                        )}>
                                            {event.status}
                                        </span>
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
