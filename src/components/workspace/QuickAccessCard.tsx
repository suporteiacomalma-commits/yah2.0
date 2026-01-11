import { LucideIcon } from "lucide-react";

interface QuickAccessCardProps {
  icon: LucideIcon;
  label: string;
  color: string;
  onClick?: () => void;
}

export function QuickAccessCard({ icon: Icon, label, color, onClick }: QuickAccessCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-all hover:scale-105 group`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-foreground" />
      </div>
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </button>
  );
}
