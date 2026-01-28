import { LogOut, User, Coins, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAbacatePay } from "@/hooks/useAbacatePay";

interface MinimalHeaderProps {
  brandName?: string;
}

export function MinimalHeader({ brandName }: MinimalHeaderProps) {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { createBilling } = useAbacatePay();
  const navigate = useNavigate();
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  const premiumPlans = [
    {
      id: "plano_semestral",
      name: "Plano Semestral",
      amount: 297,
      period: "6 meses",
      description: "Acesso completo por um semestre",
      frequency: "ONE_TIME" as const
    },
    {
      id: "plano_anual",
      name: "Plano Anual",
      amount: 497,
      period: "12 meses",
      description: "Melhor valor: acesso ilimitado por um ano",
      frequency: "ONE_TIME" as const,
      popular: true
    },
  ];

  const handlePurchase = async (plan: typeof premiumPlans[0]) => {
    await createBilling.mutateAsync({
      planId: plan.id,
      name: plan.name,
      amount: plan.amount,
      frequency: plan.frequency
    });
    setIsPurchaseOpen(false);
  };

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

        {/* Center/Right - Balances & Menu */}
        <div className="flex items-center gap-3">
          {/* Premium Status Display */}
          <div
            onClick={() => setIsPurchaseOpen(true)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 group cursor-pointer ${profile?.subscription_plan === 'premium'
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20'
              }`}
          >
            {profile?.subscription_plan === 'premium' ? (
              <>
                <Sparkles className="w-4 h-4 text-purple-500 group-hover:rotate-12 transition-transform" />
                <span className="font-bold text-sm uppercase tracking-wider">Premium</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
                <span className="font-bold text-sm capitalize">Trial: {profile?.coins || 0} Moedas</span>
              </>
            )}
          </div>

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
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Menu</p>
              </div>
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="cursor-pointer rounded-lg hover:bg-secondary transition-colors py-2"
              >
                <User className="w-4 h-4 mr-3 text-primary" />
                <span className="font-medium">Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsPurchaseOpen(true)}
                className="cursor-pointer rounded-lg hover:bg-secondary transition-colors py-2"
              >
                <Sparkles className="w-4 h-4 mr-3 text-purple-500" />
                <span className="font-medium">Assinar Premium</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive focus:text-destructive cursor-pointer rounded-lg hover:bg-destructive/5 transition-colors py-2"
              >
                <LogOut className="w-4 h-4 mr-3" />
                <span className="font-medium">Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="w-6 h-6 text-purple-500" />
              Upgrade para o Premium
            </DialogTitle>
            <DialogDescription className="text-base">
              Desbloqueie todo o potencial da YAh com gerações ilimitadas e ferramentas exclusivas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            {premiumPlans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handlePurchase(plan)}
                className={`p-6 rounded-2xl border cursor-pointer transition-all relative group overflow-hidden ${plan.popular
                    ? 'border-purple-500 bg-purple-500/5 hover:bg-purple-500/10'
                    : 'border-white/10 bg-card hover:border-purple-500/50 hover:bg-white/5'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                    Recomendado
                  </div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-foreground group-hover:text-purple-400 transition-colors">
                      {plan.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-foreground">
                      R$ {plan.amount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {plan.period}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  PIX ou Cartão em até 12x
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:justify-center items-center text-center">
            <p className="text-xs text-muted-foreground">
              Pagamento processado com segurança pela <span className="font-bold text-foreground">AbacatePay</span>.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
