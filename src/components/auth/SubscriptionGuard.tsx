import { useEffect, useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Lock, Crown, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { subscription, isLoading: subLoading, isExpired, isPremium, isAdmin } = useSubscription();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDismissed, setIsDismissed] = useState(false);

    // Re-show paywall on interaction if dismissed
    useEffect(() => {
        if (isDismissed) {
            const handleInteraction = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDismissed(false);
            };

            document.addEventListener('click', handleInteraction, true);
            document.addEventListener('keydown', handleInteraction, true);

            return () => {
                document.removeEventListener('click', handleInteraction, true);
                document.removeEventListener('keydown', handleInteraction, true);
            };
        }
    }, [isDismissed]);

    // Allow access to auth pages without check
    if (location.pathname.startsWith('/auth') || location.pathname === '/' || location.pathname.startsWith('/onboarding')) {
        return <>{children}</>;
    }

    if (authLoading || subLoading) {
        return (
            <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // If expired and not premium/admin, show paywall
    if (user && isExpired && !isPremium && !isAdmin) {
        if (isDismissed) {
            return <>{children}</>;
        }

        return (
            <>
                <div className="pointer-events-none blur-[2px]">{children}</div>
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <Card className="max-w-md w-full bg-[#09090B] border-white/10 shadow-2xl relative z-10">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 text-muted-foreground hover:text-white hover:bg-white/10"
                            onClick={() => setIsDismissed(true)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Lock className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-black text-white">Período de Teste Expirado</CardTitle>
                            <CardDescription className="text-muted-foreground mt-2">
                                Seus 7 dias de acesso gratuito terminaram. Para continuar construindo sua marca com IA, ative o plano Premium.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="text-sm font-medium text-white">Acesso ilimitado à YAh 2.0</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="text-sm font-medium text-white">Geração de carrosséis e roteiros</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="text-sm font-medium text-white">Treinamento de IA personalizado</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="text-sm font-medium text-white">Análise de perfil avançada</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-purchase-modal'))}
                                className="w-full h-12 gradient-primary rounded-xl font-bold text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                            >
                                <Crown className="w-4 h-4 mr-2" />
                                Ativar Premium Agora
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground">
                                Entre em contato com o administrador para ativar sua conta.
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            </>
        );
    }

    return <>{children}</>;
}
