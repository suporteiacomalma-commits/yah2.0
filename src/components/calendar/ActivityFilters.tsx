import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityFiltersProps {
  filters: {
    category: string;
    status: string;
    priority: string;
  };
  onFiltersChange: (filters: {
    category: string;
    status: string;
    priority: string;
  }) => void;
  onClearDate: () => void;
  hasDateFilter: boolean;
}

export function ActivityFilters({
  filters,
  onFiltersChange,
  onClearDate,
  hasDateFilter,
}: ActivityFiltersProps) {
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({ category: "all", status: "all", priority: "all" });
    onClearDate();
  };

  const hasActiveFilters =
    filters.category !== "all" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    hasDateFilter;

  return (
    <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Filtros</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Select
          value={filters.category}
          onValueChange={(v) => updateFilter("category", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="content">Conteúdo</SelectItem>
            <SelectItem value="meeting">Reunião</SelectItem>
            <SelectItem value="deadline">Prazo</SelectItem>
            <SelectItem value="reminder">Lembrete</SelectItem>
            <SelectItem value="task">Tarefa</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(v) => updateFilter("priority", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasDateFilter && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearDate}
          className="mt-2 h-6 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Mostrar todas as datas
        </Button>
      )}
    </div>
  );
}
