import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Activity } from "./ActivityCalendar";

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (activity: Omit<Activity, "id">) => void;
  defaultDate: Date;
}

export function AddActivityDialog({
  open,
  onOpenChange,
  onAdd,
  defaultDate,
}: AddActivityDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(defaultDate);
  const [category, setCategory] = useState<Activity["category"]>("task");
  const [priority, setPriority] = useState<Activity["priority"]>("medium");

  // Recurrence states
  const [frequency, setFrequency] = useState<'none' | 'daily' | 'weekly'>('none');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("09:00");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const [hours, minutes] = startTime.split(':').map(Number);
    const dateWithTime = new Date(date);
    dateWithTime.setHours(hours, minutes, 0, 0);

    const recurrenceData = {
      isRecurring: frequency !== 'none',
      frequency,
      days: frequency === 'weekly' ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
      time: startTime,
      notes: description.trim()
    };

    onAdd({
      title: title.trim(),
      description: JSON.stringify(recurrenceData),
      date: dateWithTime,
      category,
      status: "pending",
      priority,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setCategory("task");
    setPriority("medium");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Atividade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Título da atividade"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Textarea
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal h-10 border-white/10 bg-white/5 hover:bg-white/10",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Select value={category} onValueChange={(v) => setCategory(v as Activity["category"])}>
              <SelectTrigger className="h-10 border-white/10 bg-white/5 hover:bg-white/10">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Tarefa</SelectItem>
                <SelectItem value="content">Conteúdo</SelectItem>
                <SelectItem value="meeting">Reunião</SelectItem>
                <SelectItem value="deadline">Prazo</SelectItem>
                <SelectItem value="reminder">Lembrete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select value={priority} onValueChange={(v) => setPriority(v as Activity["priority"])}>
              <SelectTrigger className="h-10 border-white/10 bg-white/5 hover:bg-white/10">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa prioridade</SelectItem>
                <SelectItem value="medium">Média prioridade</SelectItem>
                <SelectItem value="high">Alta prioridade</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 border-white/10 bg-white/5 hover:bg-white/10"
              />
            </div>
          </div>

          <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Repetir:</span>
              <div className="flex gap-1 bg-black/20 p-0.5 rounded-lg">
                {(['none', 'daily', 'weekly'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={cn(
                      "px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-all",
                      frequency === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    {f === 'none' ? 'Não' : f === 'daily' ? 'Diário' : 'Semanal'}
                  </button>
                ))}
              </div>
            </div>

            {frequency === 'weekly' && (
              <div className="flex justify-between gap-1">
                {[
                  { l: 'D', v: 0 }, { l: 'S', v: 1 }, { l: 'T', v: 2 },
                  { l: 'Q', v: 3 }, { l: 'Q', v: 4 }, { l: 'S', v: 5 }, { l: 'S', v: 6 }
                ].map((day) => (
                  <button
                    key={day.v}
                    type="button"
                    onClick={() => {
                      setSelectedDays(prev =>
                        prev.includes(day.v) ? prev.filter(d => d !== day.v) : [...prev, day.v]
                      );
                    }}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all border",
                      selectedDays.includes(day.v)
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-white/5 text-muted-foreground border-transparent hover:bg-white/10"
                    )}
                  >
                    {day.l}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim()} className="gradient-primary text-primary-foreground">
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
