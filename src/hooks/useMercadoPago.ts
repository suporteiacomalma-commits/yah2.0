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

    const createPixPayment = async (planId: string, email: string, cpf: string) => {
        setIsProcessing(true);
        try {
            const { data, error } = await supabase.functions.invoke("mercado-pago-process", {
                body: {
                    planId,
                    email,
                    cpf,
                    paymentMethodId: "pix",
                    userId: user?.id,
                    installments: 1
                }
            });

            if (error) throw error;

            // Handle handled backend errors (returned as 200 OK)
            if (data.success === false) {
                throw new Error(data.error || "Erro desconhecido do servidor");
            }

            if (data.status === "pending" && data.point_of_interaction) {
                return {
                    success: true,
                    status: data.status,
                    qrCode: data.point_of_interaction.transaction_data.qr_code_base64,
                    qrCodePaste: data.point_of_interaction.transaction_data.qr_code,
                    ticketUrl: data.point_of_interaction.transaction_data.ticket_url,
                    paymentId: data.id
                };
            } else {
                toast.error(`Erro ao gerar PIX: ${data.status}`);
                return { success: false, status: data.status };
            }

        } catch (error: any) {
            console.error("Mercado Pago PIX Error (Detail):", error);

            let errorMessage = "Erro desconhecido";

            if (error?.message) {
                errorMessage = error.message;
            } else if (typeof error === "string") {
                errorMessage = error;
            } else if (error && typeof error === "object") {
                errorMessage = JSON.stringify(error);
            }

            if (errorMessage.includes("Financial Identity") || errorMessage.includes("payer is the same as the collector")) {
                errorMessage = "Erro: Em produção, você não pode pagar para sua própria conta (mesmo CPF/Email). Use dados de outra pessoa ou modo Sandbox.";
            }

            toast.error(`Erro ao gerar PIX: ${errorMessage}`);
            return { success: false, error: errorMessage };
        } finally {
            setIsProcessing(false);
        }
    };

    const createPreference = async (planId: string, email: string) => {
        try {
            const { data, error } = await supabase.functions.invoke("mercado-pago-process", {
                body: {
                    action: "create_preference",
                    planId,
                    email,
                    userId: user?.id
                }
            });

            if (error) throw error;
            return data.preferenceId;
        } catch (error: any) {
            console.error("Error creating preference:", error);
            throw error;
        }
    };

    return {
        loadMercadoPago,
        createPreference,
        processPayment,
        createPixPayment,
        isProcessing,
        publicKey: getSetting("mercado_pago_public_key")?.value?.trim()
    };
}
