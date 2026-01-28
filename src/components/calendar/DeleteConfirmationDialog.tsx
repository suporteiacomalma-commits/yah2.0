import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarRange, Clock } from "lucide-react";

interface DeleteConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (mode: "instance" | "series") => void;
    eventTitle?: string;
}

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    eventTitle
}: DeleteConfirmationDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-white/5 sm:max-w-[400px] rounded-[32px]">
                <DialogHeader className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-2">
                        <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-white text-center">
                        Como deseja apagar?
                    </DialogTitle>
                    <DialogDescription className="text-center text-muted-foreground font-medium">
                        Você está tentando remover um evento recorrente: <br />
                        <span className="text-white font-bold">"{eventTitle}"</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 py-6">
                    <Button
                        variant="outline"
                        onClick={() => onConfirm("instance")}
                        className="h-16 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 flex items-center justify-start gap-4 px-6 group transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-white">Apenas este dia</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Remover apenas esta ocorrência</p>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => onConfirm("series")}
                        className="h-16 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 flex items-center justify-start gap-4 px-6 group transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CalendarRange className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-white">Toda a série</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Remover todos os eventos futuros</p>
                        </div>
                    </Button>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="w-full h-12 rounded-xl text-muted-foreground font-bold hover:text-white"
                    >
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
