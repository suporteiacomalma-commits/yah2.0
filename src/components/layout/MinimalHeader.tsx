import { LogOut, User, Coins, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { usePlans } from "@/hooks/usePlans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAbacatePay } from "@/hooks/useAbacatePay";
import { useStripe } from "@/hooks/useStripe";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MercadoPagoCheckout } from "@/components/payment/MercadoPagoCheckout";


interface MinimalHeaderProps {
  brandName?: string;
  isPurchaseOpen?: boolean;
  setIsPurchaseOpen?: (isOpen: boolean) => void;
}

export function MinimalHeader({ brandName, isPurchaseOpen: externalIsPurchaseOpen, setIsPurchaseOpen: externalSetIsPurchaseOpen }: MinimalHeaderProps) {
  const { signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { createBilling } = useAbacatePay();
  const { createStripeCheckout } = useStripe();
  const navigate = useNavigate();

  // Use external state if provided, otherwise local state (backward compatibility)
  const [internalIsPurchaseOpen, setInternalIsPurchaseOpen] = useState(false);
  const isPurchaseOpen = externalIsPurchaseOpen !== undefined ? externalIsPurchaseOpen : internalIsPurchaseOpen;
  const setIsPurchaseOpen = externalSetIsPurchaseOpen || setInternalIsPurchaseOpen;

  const [cpf, setCpf] = useState(profile?.tax_id || "");
  const [phone, setPhone] = useState(profile?.cellphone || "");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);


  useEffect(() => {
    if (profile?.tax_id) setCpf(profile.tax_id);
    if (profile?.cellphone) setPhone(profile.cellphone);
  }, [profile]);

  const { plans: premiumPlans, isLoading: plansLoading } = usePlans(true);

  const handlePurchase = async (plan: any) => {
    if (!cpf || !phone) {
      import("sonner").then(({ toast }) => {
        toast.error("Por favor, preencha o CPF e o Telefone para continuar.");
      });
      return;
    }

    // Save to profile if changed
    // Save to profile if changed
    if (cpf !== profile?.tax_id || phone !== profile?.cellphone) {
      await updateProfile.mutateAsync({ tax_id: cpf, cellphone: phone });
    }

    if (paymentMethod === "pix") {
      await createBilling.mutateAsync({
        planId: plan.id,
        name: plan.name,
        amount: plan.amount,
        frequency: plan.frequency,
        cpf: cpf,
        phone: phone
      });
      setIsPurchaseOpen(false);
    } else {
      setSelectedPlan(plan);
    }
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
                <span className="font-bold text-sm capitalize">Trial</span>
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

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase opacity-70">CPF / CNPJ</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase opacity-70">Telefone</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>

            <Tabs defaultValue="pix" value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "pix" | "card")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pix" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> PIX (Instantâneo)
                  </span>
                </TabsTrigger>
                <TabsTrigger value="card" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Cartão
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {paymentMethod === "card" && selectedPlan && (
              <div className="mt-6 border-t border-border pt-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-purple-400">Dados do Cartão</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setSelectedPlan(null)}
                  >
                    Trocar Plano
                  </Button>
                </div>
                <MercadoPagoCheckout
                  planId={selectedPlan.id}
                  amount={selectedPlan.amount}
                  email={profile?.email || ""}
                  fullName={profile?.full_name || ""}
                  cpf={cpf}
                  phone={phone}
                  onSuccess={() => {
                    setIsPurchaseOpen(false);
                    setSelectedPlan(null);
                  }}
                />
              </div>
            )}
          </div>


          <div className="grid gap-4 py-2 max-h-[50vh] overflow-y-auto pr-1">
            {plansLoading ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <p className="text-sm text-muted-foreground">Carregando planos...</p>
              </div>
            ) : premiumPlans.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-border rounded-2xl">
                <p className="text-sm text-muted-foreground">Nenhum plano disponível no momento.</p>
              </div>
            ) : (
              premiumPlans.map((plan) => {
                const isActive = profile?.active_plan_id === plan.id && profile?.subscription_plan === 'premium';

                return (
                  <div
                    key={plan.id}
                    onClick={() => !isActive && !createBilling.isPending && !createStripeCheckout.isPending && handlePurchase(plan)}
                    className={`relative group p-5 rounded-2xl border transition-all duration-300 ${isActive
                      ? "bg-purple-500/10 border-purple-500/50 cursor-default"
                      : "bg-background/40 border-border hover:border-purple-500/50 cursor-pointer hover:bg-white/5"
                      } ${(createBilling.isPending || createStripeCheckout.isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {(createBilling.isPending || createStripeCheckout.isPending) && !isActive && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-[2px] rounded-2xl">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent animate-spin rounded-full" />
                          <span className="text-[10px] font-bold text-purple-400 uppercase">Processando...</span>
                        </div>
                      </div>
                    )}

                    {plan.popular && !isActive && (
                      <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-tighter shadow-lg">
                        RECOMENDADO
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2 sm:gap-0">
                      <div className="space-y-1 w-full sm:w-auto">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {plan.name}
                          {isActive && <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[10px] uppercase font-bold py-0 h-5">Ativo</Badge>}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                        <div className="font-black text-xl text-foreground">R$ {plan.amount}</div>
                        <div className="text-xs text-muted-foreground">{plan.period}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-green-500' : 'text-purple-500 opacity-60'}`} />
                      <span>{paymentMethod === 'pix' ? 'PIX Instantâneo' : 'Cartão de Crédito'}</span>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isActive) handlePurchase(plan);
                      }}
                      disabled={isActive || createBilling.isPending || createStripeCheckout.isPending}
                      className={`w-full h-11 rounded-xl font-bold transition-all duration-300 ${isActive
                        ? "bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/15 cursor-default"
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40"
                        }`}
                    >
                      {isActive ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Seu Plano Atual
                        </span>
                      ) : (
                        "Assinar Agora"
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:justify-center items-center text-center">
            <p className="text-xs text-muted-foreground">
              Pagamento processado com segurança pela <span className="font-bold text-foreground">AbacatePay</span> ou <span className="font-bold text-foreground">Stripe</span>.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
