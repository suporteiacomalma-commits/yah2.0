import { Check, Trash2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity } from "./ActivityCalendar";

interface ActivityListProps {
  activities: Activity[];
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

const categoryLabels: Record<Activity["category"], string> = {
  content: "Conteúdo",
  meeting: "Reunião",
  deadline: "Prazo",
  reminder: "Lembrete",
  task: "Tarefa",
};

const categoryColors: Record<Activity["category"], string> = {
  content: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  meeting: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  deadline: "bg-red-500/20 text-red-400 border-red-500/30",
  reminder: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  task: "bg-green-500/20 text-green-400 border-green-500/30",
};

const priorityIcons: Record<Activity["priority"], React.ReactNode> = {
  low: null,
  medium: <Clock className="w-3 h-3 text-yellow-500" />,
  high: <AlertCircle className="w-3 h-3 text-red-500" />,
};

const statusColors: Record<Activity["status"], string> = {
  pending: "border-muted-foreground/30",
  in_progress: "border-primary bg-primary/10",
  completed: "border-green-500 bg-green-500/20",
};

export function ActivityList({ activities, onToggleStatus, onDelete }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">Nenhuma atividade</p>
        <p className="text-sm text-muted-foreground/70">
          Adicione uma nova atividade para começar
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={cn(
            "group p-3 rounded-lg border bg-card transition-all hover:bg-muted/50",
            statusColors[activity.status],
            activity.status === "completed" && "opacity-60"
          )}
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={() => onToggleStatus(activity.id)}
              className={cn(
                "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                activity.status === "completed"
                  ? "bg-green-500 border-green-500"
                  : "border-muted-foreground/40 hover:border-primary"
              )}
            >
              {activity.status === "completed" && (
                <Check className="w-3 h-3 text-white" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "font-medium text-sm",
                    activity.status === "completed" && "line-through text-muted-foreground"
                  )}
                >
                  {activity.title}
                </span>
                {priorityIcons[activity.priority]}
              </div>
              
              {activity.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                  {activity.description}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", categoryColors[activity.category])}
                >
                  {categoryLabels[activity.category]}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {format(activity.date, "dd MMM, HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
              onClick={() => onDelete(activity.id)}
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
