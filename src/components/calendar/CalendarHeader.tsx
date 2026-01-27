import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarHeaderProps {
    currentMonth: Date;
    view: "day" | "week" | "month" | "year";
    onViewChange: (view: "day" | "week" | "month" | "year") => void;
    displayMode: "calendar" | "list";
    onDisplayModeChange: (mode: "calendar" | "list") => void;
    onAddEvent: () => void;
}

export function CalendarHeader({ view, onViewChange, displayMode, onDisplayModeChange, onAddEvent }: CalendarHeaderProps) {
    return (
        <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
                        Calendário – <span className="text-primary">Visão Completa</span>
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base font-medium">
                        Veja sua vida organizada por dia, semana, mês ou ano.
                    </p>
                </div>

                <Button
                    onClick={onAddEvent}
                    className="gradient-primary h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-bold gap-2"
                >
                    <Plus className="w-5 h-5" />
                    <span>Criar Evento</span>
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-[20px] w-fit">
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
                                "px-4 md:px-6 py-2 md:py-2.5 rounded-[16px] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all",
                                view === item.id
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-[20px] w-fit">
                    <button
                        onClick={() => onDisplayModeChange("calendar")}
                        className={cn(
                            "w-10 h-10 md:w-11 md:h-11 rounded-[16px] flex items-center justify-center transition-all",
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
                            "w-10 h-10 md:w-11 md:h-11 rounded-[16px] flex items-center justify-center transition-all",
                            displayMode === "list"
                                ? "bg-primary text-primary-foreground shadow-lg"
                                : "text-muted-foreground hover:text-white hover:bg-white/5"
                        )}
                        title="Visualização em Lista"
                    >
                        <List className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
