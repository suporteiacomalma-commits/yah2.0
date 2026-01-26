import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Crown, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TrialBanner() {
    const { isTrial, daysRemaining, isExpired, isAdmin } = useSubscription();
    const navigate = useNavigate();

    // Do not show if not in trial (or if admin, unless we want to test it, but usually hide for admin)
    // Also hide if expired (handled by guard, but just in case)
    if (!isTrial || isAdmin) return null;

    if (isExpired) return null; // Guard handles this

    return (
        <div className="bg-purple-500/10 border-b border-purple-500/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-purple-200 text-xs md:text-sm font-medium">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>
                        Período de teste em andamento.
                        <span className="text-white font-bold ml-1">
                            {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                        </span>.
                    </span>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                    onClick={() => {
                        // For now redirect to a contact or upgrade page. 
                        // Since we don't have a payment page yet, maybe just show a toast or nothing?
                        // Or redirect to profile where they might see plan details?
                        // For now let's just create a shell action
                        navigate("/profile");
                    }}
                >
                    <Crown className="w-3 h-3 mr-2" />
                    Assinar Premium
                </Button>
            </div>
        </div>
    );
}
