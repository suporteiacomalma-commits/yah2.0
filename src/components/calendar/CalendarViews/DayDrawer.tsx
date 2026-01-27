import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CerebroEvent, CATEGORY_COLORS } from "../types";
import { Check, Edit2, Trash2, Clock, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DayDrawerProps {
    date: Date | null;
    events: CerebroEvent[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onToggleStatus: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (event: CerebroEvent) => void;
}

export function DayDrawer({ date, events, open, onOpenChange, onToggleStatus, onDelete, onEdit }: DayDrawerProps) {
    if (!date) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md bg-slate-950 border-white/5 p-0 overflow-y-auto">
                <SheetHeader className="p-6 border-b border-white/5 bg-white/5">
                    <SheetTitle className="text-2xl font-black text-white leading-tight">
                        {format(date, "EEEE", { locale: ptBR })}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground font-bold">
                        {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </SheetDescription>
                </SheetHeader>

                <div className="p-6 space-y-4">
                    {events.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground italic font-medium">Nenhum evento planejado para este dia.</p>
                        </div>
                    ) : (
                        events.map((event) => {
                            const colors = CATEGORY_COLORS[event.categoria] || CATEGORY_COLORS.Outro;
                            return (
                                <div
                                    key={event.id}
                                    className="bg-white/5 border border-white/5 rounded-3xl p-5 space-y-4 transition-all hover:border-primary/20 group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                                            colors.bg, colors.text
                                        )}>
                                            <div className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
                                            {event.categoria}
                                        </div>
                                        {event.recorrencia !== 'Nenhuma' && (
                                            <Repeat className="w-3 h-3 text-muted-foreground" />
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <h4 className={cn(
                                            "text-lg font-black text-white leading-tight",
                                            event.status === 'Concluído' && "line-through opacity-50"
                                        )}>
                                            {event.titulo}
                                        </h4>
                                        {event.descricao && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">{event.descricao}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 py-2 border-y border-white/5">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            {event.hora?.substring(0, 5) || "Sem hora"}
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-white/10" />
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {event.tipo}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-2">
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={() => onEdit(event)}
                                                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/70"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={() => onDelete(event.id)}
                                                className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <Button
                                            onClick={() => onToggleStatus(event.id)}
                                            className={cn(
                                                "h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                                                event.status === 'Concluído'
                                                    ? "bg-green-500/20 text-green-400 border border-green-500/20"
                                                    : "bg-white/10 text-white hover:bg-primary hover:text-white"
                                            )}
                                        >
                                            {event.status === 'Concluído' ? (
                                                <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Concluído</span>
                                            ) : "Concluir"}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
