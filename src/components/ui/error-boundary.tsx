import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] text-[#EEEDE9] p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>

                    <h1 className="text-2xl font-bold mb-2">Ops! Algo deu errado.</h1>
                    <p className="text-[#999] mb-6 max-w-md">
                        Desculpe, encontramos um erro inesperado. Tente recarregar a página.
                    </p>

                    <Button
                        onClick={() => window.location.reload()}
                        className="bg-[#B6BC45] text-[#141414] hover:bg-[#9DA139] mb-8"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Recarregar Página
                    </Button>

                    {this.state.error && (
                        <div className="w-full max-w-2xl bg-black/40 border border-white/5 rounded-lg p-4 text-left overflow-auto max-h-[300px]">
                            <p className="font-mono text-xs text-red-400 mb-2 font-bold">
                                {this.state.error.toString()}
                            </p>
                            {this.state.errorInfo && (
                                <pre className="font-mono text-[10px] text-[#666]">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
