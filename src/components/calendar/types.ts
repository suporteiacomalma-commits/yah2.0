export type EventCategory = "Vida" | "Família" | "Trabalho" | "Conteúdo" | "Saúde" | "Casa" | "Contas" | "Estudos" | "Outro";
export type EventType = "Tarefa" | "Compromisso";
export type EventStatus = "Pendente" | "Concluído";
export type RecurrenceType = "Nenhuma" | "Diária" | "Semanal" | "Mensal" | "Anual";

export interface CerebroEvent {
    id: string;
    titulo: string;
    categoria: EventCategory;
    tipo: EventType;
    data: string; // ISO date
    hora: string | null;
    duracao: number | null;
    recorrencia: RecurrenceType;
    descricao: string | null;
    status: EventStatus;
    user_id: string;
    brand_id?: string;
    criado_em: string;
    isVirtual?: boolean;
    exclusoes?: string[]; // ISO date strings to skip
    concluidos?: string[]; // ISO date strings that are completed
    dias_da_semana?: number[]; // 0-6 for Sun-Sat
}

export const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; dot: string }> = {
    Vida: { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-500" },
    Família: { bg: "bg-pink-500/10", text: "text-pink-400", dot: "bg-pink-500" },
    Trabalho: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-500" },
    Conteúdo: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" },
    Saúde: { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-500" },
    Casa: { bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-500" },
    Contas: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500" },
    Estudos: { bg: "bg-indigo-500/10", text: "text-indigo-400", dot: "bg-indigo-500" },
    Outro: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-500" },
};
