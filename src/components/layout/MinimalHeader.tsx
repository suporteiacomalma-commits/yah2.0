import { LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface MinimalHeaderProps {
  brandName?: string;
}

export function MinimalHeader({ brandName }: MinimalHeaderProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 overflow-hidden">
            <img
              src="/logo.png"
              alt="YAh Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {brandName && (
            <span className="font-semibold text-foreground hidden sm:block text-lg">
              {brandName}
            </span>
          )}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 border border-border hover:border-primary/50 hover:bg-secondary"
            >
              <User className="w-5 h-5 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border w-56 p-2 space-y-1 shadow-2xl">
            <div className="px-3 py-2 border-b border-border/50 mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Configurações</p>
            </div>
            <DropdownMenuItem
              onClick={() => navigate("/profile")}
              className="cursor-pointer rounded-lg hover:bg-secondary transition-colors py-3"
            >
              <User className="w-4 h-4 mr-3 text-primary" />
              <span className="font-medium">Meu Perfil</span>
            </DropdownMenuItem>
            <div className="h-0.5 bg-border/30 my-1 mx-2" />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive cursor-pointer rounded-lg hover:bg-destructive/5 transition-colors py-3"
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span className="font-medium">Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
