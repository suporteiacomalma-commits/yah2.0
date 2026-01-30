import { Mic, Lightbulb, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

export function QuickAccessSection() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Assistente Pessoal */}
      <Link
        to="/assistant"
        className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-card border border-primary/50 hover:border-primary transition-all hover:scale-[1.02] group"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Mic className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-semibold text-foreground">Assistente Pessoal</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Fale. Organize. Receba avisos.</p>
        </div>
      </Link>

      {/* Ideia Inbox */}
      <Link
        to="/ideia-inbox"
        className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-all hover:scale-[1.02] group"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-amber-400" />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-semibold text-foreground">Guardar ideias</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Capture. Enriqueça com IA.</p>
        </div>
      </Link>

      {/* Calendário Editorial */}
      <Link
        to="/calendar"
        className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-card border border-accent/50 hover:border-accent transition-all hover:scale-[1.02] group"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-accent" />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-semibold text-foreground">Calendário</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gestão de posts e ideias.</p>
        </div>
      </Link>
    </div>
  );
}
