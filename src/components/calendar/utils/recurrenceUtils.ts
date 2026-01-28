import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, startOfDay, parseISO, isSameDay } from "date-fns";
import { CerebroEvent } from "../types";

export function expandRecurringEvents(events: CerebroEvent[], start: Date, end: Date): CerebroEvent[] {
    const expandedEvents: CerebroEvent[] = [];

    events.forEach(event => {
        const exclusions = event.exclusoes || [];
        const completions = event.concluidos || [];
        const selectedDays = event.dias_da_semana || [];

        // Normalize original event date for comparison
        const eventDateStr = event.data;
        const localDateOriginal = new Date(eventDateStr + 'T12:00:00');
        const dayOfWeekOriginal = localDateOriginal.getDay();

        // Check if original event matches day-of-week criteria if specific days are selected
        const matchesDayOriginal = selectedDays.length === 0 || selectedDays.includes(dayOfWeekOriginal);
        const eventDateISO = parseISO(event.data);

        // Add original event if it qualifies
        if (!isBefore(eventDateISO, start) && !isAfter(eventDateISO, end) && !exclusions.includes(eventDateStr) && matchesDayOriginal) {
            const isCompleted = event.recorrencia !== "Nenhuma"
                ? completions.includes(eventDateStr)
                : event.status === "Concluído";

            expandedEvents.push({
                ...event,
                status: isCompleted ? "Concluído" : "Pendente"
            });
        }

        if (event.recorrencia === "Nenhuma") return;

        let currentDate = eventDateISO;
        const horizon = end;

        // If days are selected for Daily/Weekly, we must check every day to catch occurrences
        const useDayByDay = (event.recorrencia === "Diária" || event.recorrencia === "Semanal") && selectedDays.length > 0;

        while (true) {
            if (useDayByDay) {
                currentDate = addDays(currentDate, 1);
            } else {
                switch (event.recorrencia) {
                    case "Diária": currentDate = addDays(currentDate, 1); break;
                    case "Semanal": currentDate = addWeeks(currentDate, 1); break;
                    case "Mensal": currentDate = addMonths(currentDate, 1); break;
                    case "Anual": currentDate = addYears(currentDate, 1); break;
                    default: return;
                }
            }

            if (isAfter(currentDate, horizon)) break;

            const currentDateStr = currentDate.toISOString().split('T')[0];
            if (exclusions.includes(currentDateStr)) continue;

            const instanceLocalDate = new Date(currentDateStr + 'T12:00:00');
            const instanceDayOfWeek = instanceLocalDate.getDay();

            // Filter by selected days
            if (selectedDays.length > 0 && !selectedDays.includes(instanceDayOfWeek)) continue;

            // Avoid duplicating the original event (already handled)
            if (isSameDay(currentDate, eventDateISO)) continue;

            const isCompleted = completions.includes(currentDateStr);

            expandedEvents.push({
                ...event,
                id: `${event.id}-virtual-${currentDate.getTime()}`,
                data: currentDateStr,
                status: isCompleted ? "Concluído" : "Pendente",
                isVirtual: true
            });
        }
    });

    return expandedEvents;
}
