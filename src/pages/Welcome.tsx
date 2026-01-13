import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Clock } from "lucide-react";

export default function Welcome() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-float opacity-50" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[100px] animate-float opacity-50" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-magenta/10 rounded-full blur-[120px] opacity-30" />
                <div className="absolute inset-0 grid-pattern opacity-20" />
            </div>

            <div className="w-full max-w-2xl relative z-10 text-center space-y-12 animate-fade-in">
                {/* Logo Section */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center shadow-glow animate-pulse-glow">
                        <Sparkles className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                        Boas-vindas e Início da Jornada
                    </h1>
                </div>

                {/* Content Section */}
                <div className="glass-dark rounded-3xl p-8 md:p-12 space-y-8 shadow-2xl relative overflow-hidden group border-white/10">
                    {/* Subtle overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                    <div className="space-y-6 relative z-10">
                        <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
                            Você não entrou aqui para produzir mais conteúdo. Entrou para <span className="text-primary font-bold">parar de carregar tudo sozinha(o).</span>
                        </p>

                        <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
                            <p>
                                Vamos configurar o cérebro que vai sustentar sua rotina e sua marca.
                            </p>
                            <p>
                                Em poucos minutos, vamos organizar suas ideias para que a IA possa trabalhar com você.
                            </p>
                            <p className="font-semibold text-foreground/80">
                                Siga as fases na ordem para o sistema funcionar com precisão.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <p className="text-primary font-bold text-xl">
                                Começaremos com a sua Personalidade.
                            </p>
                            <p className="text-muted-foreground italic">
                                É rápido, leve e não precisa ser perfeito.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="flex flex-col items-center space-y-4 animate-bounce-slow">
                    <Button
                        onClick={() => navigate("/phase/1")}
                        size="lg"
                        className="h-16 px-12 text-xl font-bold gradient-primary text-primary-foreground hover:opacity-90 glow-primary rounded-2xl group transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        Começar
                        <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </Button>

                    <div className="flex items-center gap-2 text-muted-foreground/60 font-medium">
                        <Clock className="w-4 h-4" />
                        <span>Leva apenas 5 minutos</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
