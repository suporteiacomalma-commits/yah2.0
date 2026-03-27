import { CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface PaymentSuccessProps {
    onSuccess: () => void;
    planName?: string;
}

export function PaymentSuccess({ onSuccess, planName = "Premium" }: PaymentSuccessProps) {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onSuccess();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onSuccess]);

    return (
        <div className="flex flex-col items-center justify-center py-10 px-4 space-y-8 animate-in fade-in zoom-in duration-500 text-center">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                <div className="relative bg-primary/10 p-6 rounded-full border border-primary/20">
                    <CheckCircle2 className="w-16 h-16 text-primary animate-bounce-subtle" />
                </div>
                <div className="absolute -top-4 -right-4">
                    <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
                    Pagamento Aprovado!
                </h2>
                <div className="h-1 w-12 bg-primary mx-auto rounded-full" />
                <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
                    Sua assinatura <span className="text-primary font-bold">{planName}</span> já está ativa.
                    Agora você tem acesso total a todas as ferramentas do YAh.
                </p>
            </div>

            <div className="w-full max-w-xs space-y-4">
                <Button 
                    onClick={onSuccess}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-7 rounded-2xl shadow-xl shadow-primary/20 group transition-all"
                >
                    COMEÇAR AGORA
                    <div className="ml-2 flex items-center justify-center bg-white/20 rounded-full px-2 py-0.5 text-[10px]">
                        {countdown}s
                    </div>
                </Button>
                
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Redirecionando automaticamente...
                </p>
            </div>
        </div>
    );
}

// Ensure these styles are globally available or added via Tailwind if possible
// For this environment, we'll assume the user has standard animate-pulse/fade-in
