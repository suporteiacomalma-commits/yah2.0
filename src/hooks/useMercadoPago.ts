import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "./useSystemSettings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useMercadoPago() {
    const { getSetting } = useSystemSettings();
    const { user } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);

    const loadMercadoPago = useCallback(async () => {
        if ((window as any).MercadoPago) return (window as any).MercadoPago;

        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://sdk.mercadopago.com/js/v2";
            script.onload = () => resolve((window as any).MercadoPago);
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }, []);

    const processPayment = async (params: {
        planId: string;
        cardToken: string;
        paymentMethodId: string;
        issuerId?: string;
        installments: number;
        email: string;
        fullName?: string;
        cpf?: string;
        phone?: string;
    }) => {
        setIsProcessing(true);
        try {
            const { data, error } = await supabase.functions.invoke("mercado-pago-process", {
                body: {
                    ...params,
                    userId: user?.id
                }
            });

            if (error) throw error;

            if (data.success) {
                toast.success("Pagamento aprovado! Seu plano Premium foi ativado.");
                return { success: true, status: data.status };
            } else {
                toast.error(`Pagamento não aprovado: ${data.status}`);
                return { success: false, status: data.status };
            }

        } catch (error: any) {
            console.error("Mercado Pago Error:", error);
            toast.error(`Erro ao processar pagamento: ${error.message}`);
            return { success: false, error: error.message };
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        loadMercadoPago,
        processPayment,
        isProcessing,
        publicKey: getSetting("mercado_pago_public_key")?.value?.trim()
    };
}
