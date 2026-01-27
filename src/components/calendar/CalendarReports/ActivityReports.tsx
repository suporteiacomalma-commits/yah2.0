import React from "react";
import { format, isSameDay, startOfWeek, addDays, isSameWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CerebroEvent, CATEGORY_COLORS } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReportsProps {
    date: Date;
    events: CerebroEvent[];
}

export function ActivityReports({ date, events }: ReportsProps) {
    // Daily logic
    const dayEvents = events.filter(e => isSameDay(new Date(e.data + 'T12:00:00'), date));
    const totalConcluidas = dayEvents.filter(e => e.status === "Concluído").length;
    const totalPendentes = dayEvents.filter(e => e.status === "Pendente").length;
    const tempoOcupado = dayEvents.reduce((acc, e) => acc + (e.duracao || 0), 0);
    const tempoLivre = Math.max(0, (16 * 60) - tempoOcupado); // 16h window balance
    const percentualConclusao = dayEvents.length > 0 ? (totalConcluidas / dayEvents.length) * 100 : 0;

    const chartData = [
        { name: 'Concluído', value: totalConcluidas, color: '#a855f7' },
        { name: 'Pendente', value: totalPendentes === 0 && totalConcluidas === 0 ? 1 : totalPendentes, color: 'rgba(255,255,255,0.05)' }
    ];

    // Weekly logic
    const weekStart = startOfWeek(date, { locale: ptBR });
    const weekEvents = events.filter(e => isSameWeek(new Date(e.data + 'T12:00:00'), date, { locale: ptBR }));

    const categoryStats = weekEvents.reduce((acc, e) => {
        acc[e.categoria] = (acc[e.categoria] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 pb-24">
                {/* Daily Report */}
                <div className="bg-slate-900/60 border border-white/5 rounded-[40px] p-6 md:p-8 shadow-2xl relative overflow-hidden group transition-all hover:border-primary/20">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <div className="w-48 h-48 rounded-full border-[30px] border-primary" />
                    </div>

                    <h3 className="text-xl md:text-2xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
                        Relatório Diário
                        <div className="px-3 py-1 bg-primary/20 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-tighter text-primary">{format(date, "dd/MM")}</div>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-4">
                            <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5 shadow-inner">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Status de Entrega</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white tracking-tighter">{totalConcluidas}</span>
                                    <span className="text-xs font-bold text-muted-foreground">de {dayEvents.length} tarefas</span>
                                </div>
                                <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-1000"
                                        style={{ width: `${percentualConclusao}%` }}
                                    />
                                </div>
                            </div>
                            <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5 shadow-inner">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Carga Horária</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white tracking-tighter">{Math.floor(tempoOcupado / 60)}h{tempoOcupado % 60}</span>
                                    <span className="text-xs font-bold text-muted-foreground">ocupadas</span>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                                        {Math.floor(tempoLivre / 60)}h{tempoLivre % 60} de tempo livre
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="h-48 flex flex-col items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={75}
                                        paddingAngle={percentualConclusao > 0 && percentualConclusao < 100 ? 8 : 0}
                                        dataKey="value"
                                        startAngle={90}
                                        endAngle={-270}
                                        cornerRadius={10}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                stroke="none"
                                                className="drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-black text-white tracking-tighter">{Math.round(percentualConclusao)}%</span>
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-0.5">Foco</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Weekly Report */}
                <div className="bg-slate-900/60 border border-white/5 rounded-[40px] p-6 md:p-8 shadow-2xl transition-all hover:border-primary/20 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white mb-8">Relatório Semanal</h3>

                        <div className="p-5 bg-primary/5 rounded-3xl border border-primary/10 mb-8 border-dashed">
                            <p className="text-[10px] font-black text-primary mb-2 uppercase tracking-widest">Insight do Cerebro</p>
                            <p className="text-sm text-white/90 leading-relaxed font-semibold">
                                {weekEvents.length > 10
                                    ? "Sua semana está bastante intensa! Otimize seu tempo com blocos de descanso tático."
                                    : "Uma semana equilibrada e fluida. Ótimo momento para projetos de profundidade."}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-8">
                            {Object.entries(categoryStats).map(([cat, count]) => {
                                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Outro;
                                return (
                                    <div key={cat} className="px-4 py-2 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center gap-3">
                                        <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px]", colors.dot.replace('bg-', 'bg-'))} />
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{cat}</span>
                                            <span className="text-sm font-black text-white leading-none">{count}x</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 md:gap-4 mt-auto">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const d = addDays(weekStart, i);
                            const dayEvents = weekEvents.filter(e => isSameDay(new Date(e.data + 'T12:00:00'), d));
                            const completedCount = dayEvents.filter(e => e.status === "Concluído").length;
                            const pendingCount = dayEvents.filter(e => e.status === "Pendente").length;
                            const totalCount = dayEvents.length;
                            const isDayToday = isSameDay(d, new Date());

                            // Group events by category for this day
                            const dayCategoryEntries = Object.entries(dayEvents.reduce((acc, e) => {
                                acc[e.categoria] = (acc[e.categoria] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>));

                            return (
                                <div key={i} className="flex flex-col items-center gap-4 group/bar">
                                    <div className="w-full h-24 md:h-32 bg-white/[0.03] rounded-2xl md:rounded-3xl relative overflow-hidden shadow-inner border border-white/5 flex flex-col justify-end">
                                        {/* Stacked Category Segments */}
                                        {dayCategoryEntries.map(([cat, count], idx) => {
                                            const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Outro;
                                            const percentage = (count / 5) * 100;

                                            return (
                                                <Tooltip key={cat}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={cn(
                                                                "w-full transition-all duration-300 ease-out cursor-pointer hover:brightness-125",
                                                                colors.dot.replace('bg-', 'bg-')
                                                            )}
                                                            style={{ height: `${Math.max(10, percentage)}%` }}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="flex items-center gap-2 border-white/10 bg-slate-950 px-3 py-1.5 font-bold">
                                                        <div className={cn("w-2 h-2 rounded-full", colors.dot)} />
                                                        <span className="text-[10px] uppercase text-white/50">{cat}:</span>
                                                        <span className="text-xs text-white">{count} {count === 1 ? 'tarefa' : 'tarefas'}</span>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })}

                                        {totalCount === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-5">
                                                <div className="w-0.5 h-1/2 bg-white rounded-full" />
                                            </div>
                                        )}

                                        {totalCount > 0 && (
                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 pointer-events-none">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/80 border border-white/5 backdrop-blur-md shadow-xl">
                                                    <span className="text-[7px] font-black text-emerald-400 uppercase">C:{completedCount}</span>
                                                    <span className="text-[7px] font-black text-amber-400 uppercase">P:{pendingCount}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-tighter transition-colors",
                                            isDayToday ? "text-primary" : "text-muted-foreground group-hover/bar:text-white"
                                        )}>
                                            {format(d, "EEE", { locale: ptBR }).substring(0, 3)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
