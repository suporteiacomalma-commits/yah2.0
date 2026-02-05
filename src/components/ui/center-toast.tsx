import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface CenterToastProps {
    message: string;
    show: boolean;
    onClose: () => void;
    duration?: number;
}

export const CenterToast = ({ message, show, onClose, duration = 3000 }: CenterToastProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none px-4">
            {/* Backdrop blur */}
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto ${isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={onClose}
            />

            {/* Toast Card */}
            <div
                className={`
          relative pointer-events-auto
          w-full max-w-md
          bg-[#0D0D0D]/95 
          backdrop-blur-[40px]
          border border-white/10
          rounded-[32px]
          shadow-2xl shadow-lime-500/20
          overflow-hidden
          transition-all duration-300 ease-out
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'}
        `}
            >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 via-transparent to-yellow-500/10 pointer-events-none" />

                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-lime-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Content */}
                <div className="relative p-8 flex items-center gap-6">
                    {/* Icon container */}
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center shadow-lg shadow-lime-500/30">
                            <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2.5} />
                        </div>
                        {/* Sparkle decoration */}
                        <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-lime-400 animate-pulse" />
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-white mb-1 tracking-tight">
                            Agendado!
                        </h3>
                        <p className="text-sm font-medium text-white/60 leading-relaxed">
                            Vou te lembrar quando chegar a hora
                        </p>
                    </div>
                </div>

                {/* Bottom accent line */}
                <div className="h-1 bg-gradient-to-r from-lime-500 via-lime-400 to-yellow-500" />
            </div>
        </div>
    );
};

// Hook para usar o toast customizado
export const useCenterToast = () => {
    const [toastState, setToastState] = useState({ show: false, message: '' });

    const showToast = (message: string) => {
        setToastState({ show: true, message });
    };

    const hideToast = () => {
        setToastState({ show: false, message: '' });
    };

    return { toastState, showToast, hideToast };
};
