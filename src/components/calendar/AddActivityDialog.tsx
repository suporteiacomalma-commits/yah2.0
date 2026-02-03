import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Timer, Repeat, Flag, Trash2 } from "lucide-react";
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
import { CerebroEvent, EventCategory, EventType, RecurrenceType, EventStatus, EventPriority } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
  defaultDate: Date;
  editingEvent?: CerebroEvent | null;
}

export function AddActivityDialog({
  open,
  onOpenChange,
  onAdd,
  defaultDate,
  editingEvent,
}: AddActivityDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Outro");
  const [type, setType] = useState<EventType>("Tarefa");
  const [date, setDate] = useState<Date>(defaultDate);
  const [hour, setHour] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("Nenhuma");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<EventStatus>("Pendente");
  const [priority, setPriority] = useState<EventPriority>("Média");
  const [isSaving, setIsSaving] = useState(false);

  const WEEK_DAYS = [
    { id: 0, label: "D", full: "Domingo" },
    { id: 1, label: "S", full: "Segunda" },
    { id: 2, label: "T", full: "Terça" },
    { id: 3, label: "Q", full: "Quarta" },
    { id: 4, label: "Q", full: "Quinta" },
    { id: 5, label: "S", full: "Sexta" },
    { id: 6, label: "S", full: "Sábado" },
  ];

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.titulo);
      setCategory(editingEvent.categoria);
      setType(editingEvent.tipo);
      setDate(new Date(editingEvent.data + 'T12:00:00'));
      setHour(editingEvent.hora?.substring(0, 5) || "09:00");
      setDuration(String(editingEvent.duracao || 60));
      setRecurrence(editingEvent.recorrencia);
      setSelectedDays(editingEvent.dias_da_semana || []);
      setDescription(editingEvent.descricao || "");
      setStatus(editingEvent.status);
      setPriority(editingEvent.prioridade || "Média");
    } else {
      setTitle("");
      setCategory("Outro");
      setType("Tarefa");
      setDate(defaultDate);
      setHour("09:00");
      setDuration("60");
      setRecurrence("Nenhuma");
      setSelectedDays([]);
      setDescription("");
      setStatus("Pendente");
      setPriority("Média");
    }
  }, [editingEvent, open, defaultDate]);

  const toggleDay = (dayId: number) => {
    setSelectedDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId].sort()
    );
  };

  const handleDelete = async () => {
    if (!editingEvent || !user) return;

    if (!confirm("Tem certeza que deseja apagar este evento?")) return;

    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("eventos_do_cerebro")
        .delete()
        .eq("id", editingEvent.id);

      if (error) throw error;

      toast.success("Evento apagado!");
      onAdd();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Erro ao apagar evento");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setIsSaving(true);
    try {
      const eventData = {
        titulo: title.trim(),
        categoria: category,
        tipo: type,
        data: format(date, "yyyy-MM-dd"),
        hora: hour,
        duracao: parseInt(duration),
        recorrencia: recurrence,
        dias_da_semana: recurrence !== "Nenhuma" ? selectedDays : [],
        descricao: description.trim(),
        status: status,
        prioridade: priority,
        user_id: user.id
      };

      if (editingEvent) {
        const { error } = await (supabase as any)
          .from("eventos_do_cerebro")
          .update(eventData)
          .eq("id", editingEvent.id);
        if (error) throw error;
        toast.success("Evento atualizado!");
      } else {
        const { error } = await (supabase as any)
          .from("eventos_do_cerebro")
          .insert(eventData);
        if (error) throw error;
        toast.success("Evento criado!");
      }

      onAdd();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving event:", error);
      toast.error("Erro ao salvar evento");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg bg-slate-950 border-white/5 p-4 sm:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-white tracking-tighter uppercase italic">
            {editingEvent ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Título do Evento</label>
            <Input
              placeholder="O que vamos organizar?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-14 bg-white/5 border-white/10 rounded-2xl text-lg font-bold placeholder:text-white/20 focus:ring-primary/20 transition-all font-sans"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoria</label>
              <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {["Vida", "Família", "Trabalho", "Conteúdo", "Saúde", "Casa", "Contas", "Estudos", "Outro"].map(cat => (
                    <SelectItem key={cat} value={cat} className="font-bold">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo</label>
              <Select value={type} onValueChange={(v) => setType(v as EventType)}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="Tarefa" className="font-bold text-blue-400">Tarefa</SelectItem>
                  <SelectItem value="Compromisso" className="font-bold text-amber-400">Compromisso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-12 justify-start bg-white/5 border-white/10 rounded-xl font-bold">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Horário</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 rounded-xl pl-10 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Duração (minutos)</label>
              <div className="relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 rounded-xl pl-10 font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Recorrência</label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {["Nenhuma", "Diária", "Semanal", "Mensal", "Anual"].map(rec => (
                    <SelectItem key={rec} value={rec} className="font-bold">{rec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {recurrence !== "Nenhuma" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Repetir nos dias</label>
              <div className="flex justify-between gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl">
                {WEEK_DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-[10px] font-black transition-all",
                        isSelected
                          ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.05]"
                          : "text-muted-foreground hover:bg-white/5 hover:text-white"
                      )}
                      title={day.full}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status</label>
            <div className="flex flex-wrap gap-2">
              {(["Pendente", "Concluído"] as const).map(s => (
                <button
                  key={s} type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 min-w-[120px] h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all",
                    status === s
                      ? s === 'Concluído' ? "bg-green-500/20 text-green-400 border-green-500/20 shadow-lg shadow-green-500/5" : "bg-primary/20 text-primary border-primary/20"
                      : "bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prioridade</label>
            <div className="flex flex-wrap gap-2">
              {(["Baixa", "Média", "Alta"] as const).map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 min-w-[80px] h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                    priority === p
                      ? p === 'Alta' ? "bg-red-500/20 text-red-400 border-red-500/20 shadow-lg shadow-red-500/5"
                        : p === 'Média' ? "bg-amber-500/20 text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/5"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/5"
                      : "bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10"
                  )}
                >
                  <Flag className={cn("w-3 h-3", priority === p && "fill-current")} />
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição</label>
            <Textarea
              placeholder="Notas adicionais sobre o evento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] bg-white/5 border-white/10 rounded-2xl p-4 font-medium"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-6 border-t border-white/5 mt-6">
            <div className="flex justify-start">
              {editingEvent && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="h-12 px-4 rounded-xl font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Apagar Evento</span>
                </Button>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-xl font-bold transition-all text-muted-foreground hover:text-white w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || isSaving}
                className="gradient-primary h-12 px-8 rounded-xl font-extrabold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs w-full sm:w-auto"
              >
                {isSaving ? "Salvando..." : (editingEvent ? "Salvar Alterações" : "Criar Evento")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
