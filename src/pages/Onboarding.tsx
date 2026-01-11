import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useBrand } from "@/hooks/useBrand";
import { useProfile } from "@/hooks/useProfile";
import { 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  User,
  Building2, 
  Briefcase,
  Target,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";

const sectors = [
  { id: "tech", label: "Tecnologia", icon: "💻" },
  { id: "health", label: "Saúde", icon: "🏥" },
  { id: "education", label: "Educação", icon: "📚" },
  { id: "fashion", label: "Moda", icon: "👗" },
  { id: "food", label: "Alimentação", icon: "🍽️" },
  { id: "finance", label: "Finanças", icon: "💰" },
  { id: "services", label: "Serviços", icon: "🛠️" },
  { id: "other", label: "Outro", icon: "✨" },
];

const stages = [
  { id: "idea", label: "Apenas uma ideia", description: "Ainda não comecei" },
  { id: "starting", label: "Começando", description: "Primeiros passos" },
  { id: "growing", label: "Em crescimento", description: "Já tenho clientes" },
  { id: "established", label: "Estabelecido", description: "Marca consolidada" },
];

const goals = [
  { id: "create", label: "Criar minha marca", icon: Sparkles },
  { id: "improve", label: "Melhorar presença", icon: Target },
  { id: "reposition", label: "Reposicionar", icon: Rocket },
  { id: "scale", label: "Escalar o negócio", icon: Briefcase },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [sector, setSector] = useState("");
  const [businessStage, setBusinessStage] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [description, setDescription] = useState("");
  const { createBrand } = useBrand();
  const { updateProfile } = useProfile();
  const navigate = useNavigate();

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    await createBrand.mutateAsync({
      name: brandName,
      sector,
      description,
    });

    await updateProfile.mutateAsync({
      user_name: userName,
      business_stage: businessStage,
      main_goal: mainGoal,
      onboarding_completed: true,
    });

    navigate("/dashboard");
  };

  const isLoading = createBrand.isPending || updateProfile.isPending;

  const canProceed = () => {
    switch (step) {
      case 1: return userName.trim().length > 0;
      case 2: return brandName.trim().length > 0;
      case 3: return sector.length > 0;
      case 4: return businessStage.length > 0;
      case 5: return mainGoal.length > 0;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-magenta/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Passo {step} de {totalSteps}</span>
            <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full gradient-primary transition-all duration-500 ease-out rounded-full glow-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="glass-dark rounded-2xl p-8 shadow-2xl">
          {/* Step 1: User Name */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 glow-primary">
                  <User className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Olá! Como posso te chamar?</h2>
                <p className="text-muted-foreground">Vamos personalizar sua experiência</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-name" className="text-foreground">Seu nome</Label>
                <Input
                  id="user-name"
                  placeholder="Digite seu nome"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="text-lg h-12 bg-secondary/50 border-border focus:border-primary focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Step 2: Brand Name */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 glow-primary">
                  <Building2 className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Qual o nome da sua marca?</h2>
                <p className="text-muted-foreground">Este será o nome que vamos trabalhar</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-name" className="text-foreground">Nome da marca</Label>
                <Input
                  id="brand-name"
                  placeholder="Ex: Minha Empresa"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="text-lg h-12 bg-secondary/50 border-border focus:border-primary focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Step 3: Sector */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 glow-primary">
                  <Briefcase className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Qual o setor da sua marca?</h2>
                <p className="text-muted-foreground">Selecione a área de atuação</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sectors.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSector(s.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all duration-200",
                      sector === s.id
                        ? "border-primary bg-primary/10 neon-border-glow"
                        : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
                    )}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <p className="mt-2 font-medium text-foreground">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Business Stage */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 glow-primary">
                  <Rocket className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Em qual estágio está seu negócio?</h2>
                <p className="text-muted-foreground">Isso nos ajuda a personalizar sua jornada</p>
              </div>
              <div className="space-y-3">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setBusinessStage(s.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                      businessStage === s.id
                        ? "border-primary bg-primary/10 neon-border-glow"
                        : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
                    )}
                  >
                    <p className="font-medium text-foreground">{s.label}</p>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Main Goal */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 glow-primary">
                  <Target className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Qual seu objetivo principal?</h2>
                <p className="text-muted-foreground">O que você espera alcançar?</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {goals.map((g) => {
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setMainGoal(g.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all duration-200",
                        mainGoal === g.id
                          ? "border-primary bg-primary/10 neon-border-glow"
                          : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
                      )}
                    >
                      <Icon className={cn(
                        "w-6 h-6 mb-2",
                        mainGoal === g.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <p className="font-medium text-foreground">{g.label}</p>
                    </button>
                  );
                })}
              </div>
              
              {/* Optional description */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="description" className="text-foreground">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Conte um pouco mais sobre sua marca..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-secondary/50 border-border focus:border-primary focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-12 border-border hover:bg-secondary hover:border-primary/50"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Voltar
              </Button>
            )}
            
            {step < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 h-12 gradient-primary text-primary-foreground hover:opacity-90 glow-primary"
              >
                Continuar
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={!canProceed() || isLoading}
                className="flex-1 h-12 gradient-primary text-primary-foreground hover:opacity-90 glow-primary"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Começar jornada
                    <Sparkles className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
