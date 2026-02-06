import { useEffect, useState } from "react";
import { useMercadoPago } from "@/hooks/useMercadoPago";
import { Loader2, Copy, CheckCircle2, AlertCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MercadoPagoPixCheckoutProps {
    planId: string;
    amount: number;
    email: string;
    fullName?: string;
    cpf?: string;
    phone?: string;
    onSuccess?: () => void;
}

export function MercadoPagoPixCheckout({ planId, amount, email, fullName, cpf, phone, onSuccess }: MercadoPagoPixCheckoutProps) {
    const { createPixPayment, isProcessing } = useMercadoPago();
    const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
    const [qrCodeCopyPaste, setQrCodeCopyPaste] = useState<string | null>(null);
    const [ticketUrl, setTicketUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generatePix = async () => {
        if (!cpf) {
            setError("CPF é obrigatório para pagamento via PIX.");
            return;
        }

        setError(null); // Clear previous errors
        const result = await createPixPayment(planId, email, cpf);

        if (result.success) {
            setQrCodeImage(result.qrCode);
            setQrCodeCopyPaste(result.qrCodePaste);
            setTicketUrl(result.ticketUrl);
            toast.success("PIX gerado com sucesso!");
        } else {
            setError(result.error || "Falha ao gerar o PIX.");
        }
    };

    const copyToClipboard = () => {
        if (qrCodeCopyPaste) {
            navigator.clipboard.writeText(qrCodeCopyPaste);
            setCopied(true);
            toast.success("Código PIX copiado!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center p-8 gap-4 animate-fade-in">
                <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                <p className="text-sm font-bold text-purple-400 uppercase tracking-widest animate-pulse">
                    Gerando PIX...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 gap-4 text-center animate-fade-in">
                <div className="p-3 bg-red-500/10 rounded-full">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-red-400">Erro ao gerar PIX</h3>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <Button variant="outline" onClick={generatePix}>
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    if (!qrCodeImage) {
        return (
            <div className="flex flex-col items-center justify-center p-6 gap-4 animate-fade-in w-full">
                <p className="text-sm text-center text-muted-foreground">
                    Confirme seus dados acima e clique para gerar o QR Code.
                </p>
                <Button
                    onClick={generatePix}
                    className="w-full bg-purple-600 hover:bg-purple-500 font-bold"
                >
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar QR Code PIX
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center space-y-6 pt-2 animate-fade-in w-full text-center">
            {/* Same QR Code display logic as before */}
            <div className="bg-purple-500/10 p-4 rounded-full">
                <QrCode className="w-8 h-8 text-purple-500" />
            </div>

            <div className="space-y-2">
                <h3 className="font-bold text-lg">Pagamento via PIX</h3>
                <p className="text-sm text-muted-foreground px-4">
                    Escaneie o QR Code abaixo ou copie o código para pagar no app do seu banco.
                </p>
            </div>

            {qrCodeImage && (
                <div className="p-4 bg-white rounded-xl shadow-lg shadow-purple-500/10 border border-purple-100">
                    <img
                        src={`data:image/png;base64,${qrCodeImage}`}
                        alt="QR Code PIX"
                        className="w-48 h-48 object-contain"
                    />
                </div>
            )}

            <div className="w-full max-w-xs space-y-3">
                <div className="relative">
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-10" />
                    <pre className="text-[10px] text-muted-foreground bg-secondary/50 p-3 rounded-lg overflow-x-auto text-left border border-border max-h-[60px]">
                        {qrCodeCopyPaste}
                    </pre>
                </div>

                <Button
                    className="w-full gap-2 font-bold"
                    variant={copied ? "default" : "secondary"}
                    onClick={copyToClipboard}
                >
                    {copied ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Copiado!
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4" />
                            Copiar Código PIX
                        </>
                    )}
                </Button>

                <p className="text-[10px] text-muted-foreground pt-2">
                    O pagamento será aprovado instantaneamente após a confirmação.
                </p>
            </div>

            {ticketUrl && (
                <a
                    href={ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                >
                    Abrir link de pagamento externo
                </a>
            )}
        </div>
    );
}
