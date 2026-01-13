import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (!fullName.trim()) {
        toast.error("Nome é obrigatório");
        return;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Conta criada com sucesso!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-neon-magenta/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          {/* Logo */}
          <div className="flex justify-center mb-0">
            <div className="w-64 h-64">
              <img
                src="/logo.png"
                alt="YAh Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-muted-foreground text-sm">
              Construa sua marca de forma estratégica
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/30 p-1 rounded-full h-12">
              <TabsTrigger
                value="signin"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email-signin" className="text-foreground text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Input
                      id="email-signin"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl pr-12"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                      <span className="text-destructive text-xs">💬</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin" className="text-foreground text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password-signin"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl pr-12"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                      <span className="text-destructive text-xs">💬</span>
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-neon-magenta text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name-signup" className="text-foreground text-sm font-medium">Nome completo</Label>
                  <Input
                    id="name-signup"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup" className="text-foreground text-sm font-medium">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup" className="text-foreground text-sm font-medium">Senha</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-neon-magenta text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
