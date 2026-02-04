import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, List, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarHeaderProps {
    currentDate: Date;
    view: "day" | "week" | "month" | "year";
    onViewChange: (view: "day" | "week" | "month" | "year") => void;
    displayMode: "calendar" | "list";
    onDisplayModeChange: (mode: "calendar" | "list") => void;
    onAddEvent: () => void;
    onPrev: () => void;
    onNext: () => void;
}

export function CalendarHeader({
    currentDate,
    view,
    onViewChange,
    displayMode,
    onDisplayModeChange,
    onAddEvent,
    onPrev,
    onNext
}: CalendarHeaderProps) {
    const getPeriodLabel = () => {
        if (view === 'day') return format(currentDate, "dd 'de' MMMM", { locale: ptBR });
        if (view === 'year') return format(currentDate, "yyyy");
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    };

    return (
        <div className="flex flex-col gap-6 mb-8">


            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 md:p-1 rounded-[16px] md:rounded-[20px] w-fit">
                        {[
                            { id: "day", label: "Dia" },
                            { id: "week", label: "Semana" },
                            { id: "month", label: "Mês" },
                            { id: "year", label: "Ano" },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id as any)}
                                className={cn(
                                    "px-2.5 md:px-6 py-1.5 md:py-2.5 rounded-[12px] md:rounded-[16px] text-[9px] md:text-xs font-black uppercase tracking-widest transition-all",
                                    view === item.id
                                        ? "bg-primary text-primary-foreground shadow-lg"
                                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 md:p-1 rounded-[16px] md:rounded-[20px] w-fit">
                        <button
                            onClick={() => onDisplayModeChange("calendar")}
                            className={cn(
                                "w-9 h-9 md:w-11 md:h-11 rounded-[12px] md:rounded-[16px] flex items-center justify-center transition-all",
                                displayMode === "calendar"
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                            title="Visualização em Grade"
                        >
                            <LayoutGrid className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        </button>
                        <button
                            onClick={() => onDisplayModeChange("list")}
                            className={cn(
                                "w-9 h-9 md:w-11 md:h-11 rounded-[12px] md:rounded-[16px] flex items-center justify-center transition-all",
                                displayMode === "list"
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                            title="Visualização em Lista"
                        >
                            <List className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        </button>
                    </div>

                    <Button
                        onClick={onAddEvent}
                        className="gradient-primary h-9 md:h-10 px-4 md:px-6 rounded-[12px] md:rounded-[16px] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-bold gap-1.5 md:gap-2 text-[10px] md:text-xs"
                    >
                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Criar Evento</span>
                        <span className="sm:hidden">Criar</span>
                    </Button>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 md:p-1 rounded-[16px] md:rounded-[20px]">
                        <button
                            onClick={onPrev}
                            className="w-9 h-9 md:w-10 md:h-10 rounded-[12px] md:rounded-[16px] flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                            onClick={onNext}
                            className="w-9 h-9 md:w-10 md:h-10 rounded-[12px] md:rounded-[16px] flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
                        >
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                    <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-white/90 min-w-[120px] md:min-w-[140px] text-center bg-primary/10 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-primary/20">
                        {getPeriodLabel()}
                    </span>
                </div>
            </div>
        </div>
    );
}
