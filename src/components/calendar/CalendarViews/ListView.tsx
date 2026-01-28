import React from "react";
import { format, isSameDay, startOfMonth, startOfWeek, endOfWeek, endOfMonth, endOfYear, startOfYear, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CerebroEvent, CATEGORY_COLORS } from "../types";
import { Check, Clock, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ListViewProps {
    date: Date;
    view: "day" | "week" | "month" | "year";
    events: CerebroEvent[];
    onToggleStatus: (id: string) => void;
    onEdit: (event: CerebroEvent) => void;
    onDelete: (id: string) => void;
}

export function ListView({ date, view, events, onToggleStatus, onEdit, onDelete }: ListViewProps) {
    // Get date range based on view
    const getRange = () => {
        let start, end;
        if (view === "day") {
            start = date;
            end = date;
        } else if (view === "week") {
            start = startOfWeek(date, { locale: ptBR });
            end = endOfWeek(date, { locale: ptBR });
        } else if (view === "month") {
            start = startOfMonth(date);
            end = endOfMonth(date);
        } else {
            start = startOfYear(date);
            end = endOfYear(date);
        }
        return { start, end };
    };

    const { start, end } = getRange();

    // Filter events for this range and sort
    const dateRangeEvents = events.filter(e => {
        const eventDate = new Date(e.data + 'T12:00:00');
        return eventDate >= start && eventDate <= end;
    }).sort((a, b) => {
        const dateA = new Date(a.data + 'T' + (a.hora || '00:00'));
        const dateB = new Date(b.data + 'T' + (b.hora || '00:00'));
        return dateA.getTime() - dateB.getTime();
    });

    // Grouping logic
    const groups: { title: string; events: CerebroEvent[] }[] = [];

    if (view === "day") {
        groups.push({ title: format(date, "EEEE, d 'de' MMMM", { locale: ptBR }), events: dateRangeEvents });
    } else {
        // Group by day for other views
        const dayMap = new Map<string, CerebroEvent[]>();
        dateRangeEvents.forEach(e => {
            const dateStr = e.data;
            if (!dayMap.has(dateStr)) dayMap.set(dateStr, []);
            dayMap.get(dateStr)?.push(e);
        });

        Array.from(dayMap.keys()).sort().forEach(dateStr => {
            const dateObj = new Date(dateStr + 'T12:00:00');
            groups.push({
                title: format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR }),
                events: dayMap.get(dateStr) || []
            });
        });
    }

    if (dateRangeEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-widest text-white">Nenhum evento</h3>
                <p className="text-xs font-bold mt-1">Nenhuma atividade agendada para este período.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {groups.map((group, idx) => (
                <div key={idx} className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 pl-2 border-l-2 border-primary/30">
                        {group.title}
                    </h3>

                    <div className="grid gap-3">
                        {group.events.map((event) => {
                            const colors = CATEGORY_COLORS[event.categoria] || CATEGORY_COLORS.Outro;
                            const isCompleted = event.status === "Concluído";

                            return (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "group relative flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300",
                                        "bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-white/[0.03] shadow-lg",
                                        isCompleted && "opacity-50"
                                    )}
                                >
                                    {/* Category Indicator */}
                                    <div className={cn("w-1 h-10 rounded-full", colors.dot.replace('bg-', 'bg-'))} />

                                    {/* Time */}
                                    <div className="flex flex-col min-w-[60px]">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{event.hora?.substring(0, 5) || "--:--"}</span>
                                        <span className="text-[8px] font-bold text-primary/60 uppercase">{event.tipo}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={cn("text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md border border-white/5", colors.bg, colors.text)}>
                                                {event.categoria}
                                            </span>
                                        </div>
                                        <h4 className={cn(
                                            "text-sm font-extrabold text-white truncate group-hover:text-primary transition-colors",
                                            isCompleted && "line-through opacity-70"
                                        )}>
                                            {event.titulo}
                                        </h4>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onToggleStatus(event.id)}
                                            className={cn(
                                                "w-10 h-10 rounded-2xl transition-all",
                                                isCompleted ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/40 hover:text-white"
                                            )}
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit(event)}
                                            className="w-10 h-10 rounded-2xl bg-white/5 text-white/40 hover:text-white"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(event.id)}
                                            className="w-10 h-10 rounded-2xl bg-white/5 text-red-400/40 hover:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
