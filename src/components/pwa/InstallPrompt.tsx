import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        setIsStandalone(isInStandaloneMode);

        // Check if iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(iOS);

        // Check if user already dismissed the prompt
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed) : 0;
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

        // Show prompt if not installed, not dismissed recently (7 days), and on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (!isInStandaloneMode && isMobile && daysSinceDismissed > 7) {
            if (iOS) {
                // For iOS, show custom instructions after a delay
                setTimeout(() => setShowPrompt(true), 3000);
            }
        }

        // Listen for beforeinstallprompt event (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);

            // Show prompt after a delay
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        setShowPrompt(false);
    };

    if (isStandalone || !showPrompt) {
        return null;
    }

    // iOS Install Instructions
    if (isIOS) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black/95 to-transparent animate-in slide-in-from-bottom duration-500">
                <div className="max-w-md mx-auto bg-card border border-primary/20 rounded-3xl p-6 shadow-2xl">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                            <Smartphone className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1 space-y-3">
                            <div>
                                <h3 className="font-bold text-lg text-foreground">Instalar YAH 2.0</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Adicione à tela inicial para acesso rápido
                                </p>
                            </div>

                            <div className="text-xs text-muted-foreground space-y-2 bg-white/5 p-3 rounded-xl">
                                <p className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">1</span>
                                    Toque no botão <strong>Compartilhar</strong> (ícone de compartilhamento)
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">2</span>
                                    Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">3</span>
                                    Toque em <strong>"Adicionar"</strong>
                                </p>
                            </div>

                            <Button
                                onClick={handleDismiss}
                                variant="ghost"
                                className="w-full text-xs text-muted-foreground hover:text-foreground"
                            >
                                Agora não
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Android/Chrome Install Prompt
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black/95 to-transparent animate-in slide-in-from-bottom duration-500">
            <div className="max-w-md mx-auto bg-card border border-primary/20 rounded-3xl p-6 shadow-2xl">
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                        <Download className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="font-bold text-lg text-foreground">Instalar YAH 2.0</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Instale o app para acesso rápido e experiência completa
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleInstallClick}
                                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold rounded-xl"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Instalar
                            </Button>
                            <Button
                                onClick={handleDismiss}
                                variant="ghost"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Agora não
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
