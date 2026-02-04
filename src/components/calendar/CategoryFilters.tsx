import React from "react";
import { cn } from "@/lib/utils";

export const CATEGORIES = [
    { id: "Vida", color: "bg-purple-500", border: "border-purple-500/20" },
    { id: "Família", color: "bg-pink-500", border: "border-pink-500/20" },
    { id: "Trabalho", color: "bg-blue-500", border: "border-blue-500/20" },
    { id: "Conteúdo", color: "bg-amber-500", border: "border-amber-500/20" },
    { id: "Saúde", color: "bg-green-500", border: "border-green-500/20" },
    { id: "Casa", color: "bg-cyan-500", border: "border-cyan-500/20" },
    { id: "Contas", color: "bg-red-500", border: "border-red-500/20" },
    { id: "Estudos", color: "bg-indigo-500", border: "border-indigo-500/20" },
    { id: "Outro", color: "bg-slate-500", border: "border-slate-500/20" },
];

interface CategoryFiltersProps {
    selectedCategories: string[];
    onChange: (categories: string[]) => void;
}

export function CategoryFilters({ selectedCategories, onChange }: CategoryFiltersProps) {
    const toggleCategory = (id: string) => {
        if (selectedCategories.includes(id)) {
            onChange(selectedCategories.filter((c) => c !== id));
        } else {
            onChange([...selectedCategories, id]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 mb-8 items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mr-2">Filtrar:</span>
            {CATEGORIES.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                        "px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] font-bold border transition-all flex items-center gap-2",
                        selectedCategories.includes(cat.id)
                            ? cn(cat.color, "text-white border-transparent shadow-lg shadow-black/20")
                            : cn("bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10")
                    )}
                >
                    <div className={cn("w-1.5 h-1.5 rounded-full", selectedCategories.includes(cat.id) ? "bg-white" : cat.color)} />
                    {cat.id}
                </button>
            ))}
            <button
                onClick={() => onChange(CATEGORIES.map((c) => c.id))}
                className="text-[10px] font-bold text-primary hover:underline ml-2"
            >
                Limpar
            </button>
        </div>
    );
}
