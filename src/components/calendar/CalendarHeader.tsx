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
            <div className="flex flex-col md:flex-row items-center gap-4 justify-between w-full">
                {/* 1. Create Button (Mobile: Top, Desktop: Order 3) */}
                <Button
                    onClick={onAddEvent}
                    className="order-1 md:order-3 w-full md:w-auto gradient-primary h-12 md:h-10 px-4 md:px-6 rounded-[12px] md:rounded-[16px] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-bold gap-1.5 md:gap-2 text-sm md:text-xs"
                >
                    <Plus className="w-5 h-5 md:w-4 md:h-4" />
                    <span>Criar atividade</span>
                </Button>

                {/* 2. View Selector (Mobile: Middle, Desktop: Order 1) */}
                <div className="order-2 md:order-1 flex items-center gap-1 bg-white/5 border border-white/10 p-1 md:p-1 rounded-[16px] md:rounded-[20px] w-full md:w-fit justify-between md:justify-start">
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
                                "flex-1 md:flex-none px-2 md:px-6 py-2.5 md:py-2.5 rounded-[12px] md:rounded-[16px] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all",
                                view === item.id
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* 3. Bottom Row: Display Mode + Nav Controls (Mobile: Bottom, Desktop: Split) */}
                <div className="order-3 md:contents flex items-center justify-between w-full gap-4">
                    {/* Display Mode (Desktop: Order 2) */}
                    <div className="md:order-2 flex items-center gap-1 bg-white/5 border border-white/10 p-1 md:p-1 rounded-[16px] md:rounded-[20px] w-fit">
                        <button
                            onClick={() => onDisplayModeChange("calendar")}
                            className={cn(
                                "w-10 h-10 md:w-11 md:h-11 rounded-[12px] md:rounded-[16px] flex items-center justify-center transition-all",
                                displayMode === "calendar"
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                            title="Visualização em Grade"
                        >
                            <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                            onClick={() => onDisplayModeChange("list")}
                            className={cn(
                                "w-10 h-10 md:w-11 md:h-11 rounded-[12px] md:rounded-[16px] flex items-center justify-center transition-all",
                                displayMode === "list"
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                            title="Visualização em Lista"
                        >
                            <List className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>

                    {/* Navigation Controls (Desktop: Order 4) */}
                    <div className="md:order-4 flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-[16px] md:rounded-[20px]">
                        <button
                            onClick={onPrev}
                            className="w-10 h-10 md:w-10 md:h-10 rounded-[12px] md:rounded-[16px] flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5 md:w-5 md:h-5" />
                        </button>
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-white/90 min-w-[100px] md:min-w-[140px] text-center px-2">
                            {getPeriodLabel()}
                        </span>
                        <button
                            onClick={onNext}
                            className="w-10 h-10 md:w-10 md:h-10 rounded-[12px] md:rounded-[16px] flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
                        >
                            <ChevronRight className="w-5 h-5 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
