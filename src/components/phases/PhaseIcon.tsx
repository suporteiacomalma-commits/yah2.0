import { LucideIcon, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhaseStatus = "locked" | "current" | "completed" | "available";

interface PhaseIconProps {
  icon: LucideIcon;
  phaseNumber: number;
  status: PhaseStatus;
  title: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

// Solid colors for each phase (no transparency, vibrant like gaming badges)
const phaseColors: Record<number, { bg: string; icon: string }> = {
  1: { bg: "bg-pink-500", icon: "text-white" },
  2: { bg: "bg-purple-600", icon: "text-white" },
  3: { bg: "bg-lime-400", icon: "text-gray-900" },
  4: { bg: "bg-cyan-400", icon: "text-gray-900" },
  5: { bg: "bg-orange-500", icon: "text-white" },
  6: { bg: "bg-blue-500", icon: "text-white" },
  7: { bg: "bg-emerald-500", icon: "text-white" },
  8: { bg: "bg-violet-600", icon: "text-white" },
  9: { bg: "bg-yellow-400", icon: "text-gray-900" },
  10: { bg: "bg-rose-500", icon: "text-white" },
  11: { bg: "bg-fuchsia-500", icon: "text-white" },
};

export function PhaseIcon({ icon: Icon, phaseNumber, status, title, onClick, size = "md" }: PhaseIconProps) {
  const sizeClasses = {
    sm: "w-full h-14",
    md: "w-20 h-20 md:w-24 md:h-24",
    lg: "w-28 h-28",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-9 h-9 md:w-11 md:h-11",
    lg: "w-14 h-14",
  };

  const colors = phaseColors[phaseNumber] || phaseColors[1];
  const isClickable = status !== "locked";

  // Compact horizontal layout for small size
  if (size === "sm") {
    return (
      <button
        onClick={isClickable ? onClick : undefined}
        disabled={!isClickable}
        className={cn(
          "relative rounded-xl flex items-center gap-3 px-3 py-2.5 transition-all duration-300",
          sizeClasses[size],
          status === "locked" && "bg-zinc-800/50 border border-zinc-700/50 cursor-not-allowed",
          status === "current" && "bg-card border border-primary/50 cursor-pointer hover:scale-[1.02]",
          status === "completed" && "bg-card border border-primary/50 cursor-pointer hover:scale-[1.02]",
          status === "available" && "bg-card border border-border/50 cursor-pointer hover:scale-[1.02] hover:border-border"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          status === "locked" ? "bg-zinc-700" : "bg-primary/20"
        )}>
          <Icon className={cn("w-4 h-4", status === "locked" ? "text-zinc-500" : "text-primary")} />
        </div>

        {/* Title */}
        <span className={cn(
          "text-sm font-medium truncate",
          status === "locked" ? "text-muted-foreground/50" : "text-foreground"
        )}>
          {title}
        </span>

        {/* Status indicator */}
        {status === "completed" && (
          <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
          </div>
        )}
        {status === "locked" && (
          <div className="ml-auto">
            <Lock className="w-4 h-4 text-zinc-600" />
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={isClickable ? onClick : undefined}
        disabled={!isClickable}
        className={cn(
          "relative rounded-2xl flex items-center justify-center transition-all duration-300",
          sizeClasses[size],
          status === "locked" && "bg-zinc-700 cursor-not-allowed opacity-60",
          status === "current" && cn(colors.bg, "cursor-pointer hover:scale-105 ring-4 ring-white/30"),
          status === "completed" && cn(colors.bg, "cursor-pointer hover:scale-105"),
          status === "available" && cn(colors.bg, "cursor-pointer hover:scale-105 opacity-80 hover:opacity-100")
        )}
      >
        {/* Icon */}
        {status === "locked" ? (
          <Lock className={cn("text-zinc-500", iconSizes[size])} />
        ) : status === "completed" ? (
          <div className="relative">
            <Icon className={cn(colors.icon, iconSizes[size])} />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
              <Check className="w-4 h-4 text-emerald-500" strokeWidth={3} />
            </div>
          </div>
        ) : (
          <Icon className={cn(colors.icon, iconSizes[size])} />
        )}

        {/* Phase number badge */}
        <span className={cn(
          "absolute -bottom-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md",
          status === "locked" ? "bg-zinc-600 text-zinc-400" : "bg-white text-gray-900"
        )}>
          {phaseNumber}
        </span>
      </button>

      {/* Title below icon */}
      <span className={cn(
        "text-xs font-medium text-center max-w-[80px] md:max-w-[100px] leading-tight mt-1",
        status === "locked" ? "text-muted-foreground/50" : "text-foreground"
      )}>
        {title}
      </span>
    </div>
  );
}
