import { Mic, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";

export function QuickAccessSection() {
  return (
    <div className="grid grid-cols-2 gap-3">
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
      <button className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-all hover:scale-[1.02] group">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-amber-400" />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-semibold text-foreground">Ideia Inbox</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Capture ideias. Enriqueça com IA.</p>
        </div>
      </button>
    </div>
  );
}
