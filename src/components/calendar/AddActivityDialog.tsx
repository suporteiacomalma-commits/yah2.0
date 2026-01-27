import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Timer, Repeat } from "lucide-react";
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
import { CerebroEvent, EventCategory, EventType, RecurrenceType, EventStatus } from "./types";
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
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<EventStatus>("Pendente");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.titulo);
      setCategory(editingEvent.categoria);
      setType(editingEvent.tipo);
      setDate(new Date(editingEvent.data + 'T12:00:00'));
      setHour(editingEvent.hora?.substring(0, 5) || "09:00");
      setDuration(String(editingEvent.duracao || 60));
      setRecurrence(editingEvent.recorrencia);
      setDescription(editingEvent.descricao || "");
      setStatus(editingEvent.status);
    } else {
      setTitle("");
      setCategory("Outro");
      setType("Tarefa");
      setDate(defaultDate);
      setHour("09:00");
      setDuration("60");
      setRecurrence("Nenhuma");
      setDescription("");
      setStatus("Pendente");
    }
  }, [editingEvent, open, defaultDate]);

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
        descricao: description.trim(),
        status: status,
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
      <DialogContent className="sm:max-w-lg bg-slate-950 border-white/5 p-8 max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status</label>
            <div className="flex gap-2">
              {(["Pendente", "Concluído"] as const).map(s => (
                <button
                  key={s} type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all",
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
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição</label>
            <Textarea
              placeholder="Notas adicionais sobre o evento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] bg-white/5 border-white/10 rounded-2xl p-4 font-medium"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 rounded-xl font-bold transition-all"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isSaving}
              className="gradient-primary h-12 px-8 rounded-xl font-extrabold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs"
            >
              {isSaving ? "Salvando..." : (editingEvent ? "Salvar Alterações" : "Criar Evento")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
