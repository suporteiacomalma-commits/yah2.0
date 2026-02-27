export type EventCategory = "Vida" | "Família" | "Trabalho" | "Conteúdo" | "Saúde" | "Casa" | "Contas" | "Estudos" | "Outro";
export type EventType = "Tarefa" | "Compromisso";
export type EventStatus = "Pendente" | "Concluído";
export type RecurrenceType = "Nenhuma" | "Diária" | "Semanal" | "Mensal" | "Anual";

export type EventPriority = "Baixa" | "Média" | "Alta";

export interface CerebroEvent {
    id: string;
    titulo: string;
    categoria: EventCategory;
    tipo: EventType;
    prioridade?: EventPriority; // Optional in case existing records don't have it
    data: string; // ISO date
    hora: string | null;
    duracao: number | null;
    recorrencia: RecurrenceType;
    is_recurring?: boolean;
    rrule?: string | null;
    timezone?: string;
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
    Vida: { bg: "bg-purple-600", text: "text-white", dot: "bg-white" },
    Família: { bg: "bg-pink-600", text: "text-white", dot: "bg-white" },
    Trabalho: { bg: "bg-blue-600", text: "text-white", dot: "bg-white" },
    Conteúdo: { bg: "bg-amber-600", text: "text-white", dot: "bg-white" },
    Saúde: { bg: "bg-green-600", text: "text-white", dot: "bg-white" },
    Casa: { bg: "bg-cyan-600", text: "text-white", dot: "bg-white" },
    Contas: { bg: "bg-red-600", text: "text-white", dot: "bg-white" },
    Estudos: { bg: "bg-indigo-600", text: "text-white", dot: "bg-white" },
    Outro: { bg: "bg-slate-700", text: "text-white", dot: "bg-white" },
};

export function normalizeCategory(catString: string | undefined | null): EventCategory {
    if (!catString) return "Outro";

    // Some AI generations might use formats like "SAÚDE|EDUCAÇÃO" or "Saúde, Família"
    const firstPart = catString.split(/[|,]/)[0].trim();

    const validCategories: EventCategory[] = [
        "Vida", "Família", "Trabalho", "Conteúdo",
        "Saúde", "Casa", "Contas", "Estudos", "Outro"
    ];

    // Find a case-insensitive match (or match ignoring accents if possible, but exact accent match is preferred first)
    // AI usually returns uppercase like SAÚDE.
    const normalizedFirstPart = firstPart.toUpperCase();
    const matched = validCategories.find(c => c.toUpperCase() === normalizedFirstPart);

    return matched || "Outro";
}
