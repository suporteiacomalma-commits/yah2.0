import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, startOfDay, parseISO, isSameDay } from "date-fns";
import { RRule } from "rrule";
import { CerebroEvent } from "../types";

export function expandRecurringEvents(events: CerebroEvent[], start: Date, end: Date): CerebroEvent[] {
    const expandedEvents: CerebroEvent[] = [];

    events.forEach(event => {
        const exclusions = event.exclusoes || [];
        const completions = event.concluidos || [];
        const eventDateISO = parseISO(event.data);
        const eventDateStr = event.data;

        // Legacy check for selectedDays to maintain backward compatibility if used
        const selectedDays = event.dias_da_semana || [];
        const localDateOriginal = new Date(eventDateStr + 'T12:00:00');
        const dayOfWeekOriginal = localDateOriginal.getDay();
        const matchesDayOriginal = selectedDays.length === 0 || selectedDays.includes(dayOfWeekOriginal);

        // ALWAYS evaluate the master event first (Original date)
        if (!isBefore(eventDateISO, start) && !isAfter(eventDateISO, end) && !exclusions.includes(eventDateStr) && matchesDayOriginal) {
            const isCompleted = event.recorrencia !== "Nenhuma" || event.is_recurring
                ? completions.includes(eventDateStr)
                : event.status === "Concluído";

            expandedEvents.push({
                ...event,
                status: isCompleted ? "Concluído" : "Pendente"
            });
        }

        // If it's none and not flagged as is_recurring, skip iteration
        if (event.recorrencia === "Nenhuma" && !event.is_recurring) return;

        // NEW METHOD: RFC5545 RRULE Parsing
        if (event.rrule) {
            try {
                // Initialize rule from string
                const ruleOptions = RRule.parseString(event.rrule);
                // Force the dtstart of the rule to be the original event start date locally
                ruleOptions.dtstart = new Date(event.data + "T00:00:00Z"); // Neutral UTC start to avoid timezone shifts in rule math
                const rule = new RRule(ruleOptions);

                // Get occurrences between start and end
                // Convert our visible view boundaries to UTC neutralized dates for RRule
                const viewStartUTC = new Date(start.toISOString().split('T')[0] + "T00:00:00Z");
                const viewEndUTC = new Date(end.toISOString().split('T')[0] + "T23:59:59Z");
                const occurrences = rule.between(viewStartUTC, viewEndUTC, true);

                occurrences.forEach(dateObj => {
                    // Get YYYY-MM-DD from the UTC date safely
                    const currentDateStr = dateObj.toISOString().split('T')[0];

                    // Skip if it's the master event date (already added above)
                    if (currentDateStr === eventDateStr) return;
                    // Skip if excluded
                    if (exclusions.includes(currentDateStr)) return;

                    const isCompleted = completions.includes(currentDateStr);

                    expandedEvents.push({
                        ...event,
                        id: `${event.id}-virtual-${dateObj.getTime()}`,
                        data: currentDateStr,
                        status: isCompleted ? "Concluído" : "Pendente",
                        isVirtual: true
                    });
                });

                return; // Stop here, handled by RRULE
            } catch (e) {
                console.error("Failed to parse RRULE for event:", event.titulo, e);
                // Fallback to legacy if parse fails
            }
        }

        // LEGACY METHOD: Simple increments
        let currentDate = eventDateISO;
        const horizon = end;

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
                    default: return; // Safety exit
                }
            }

            if (isAfter(currentDate, horizon)) break;

            const currentDateStr = currentDate.toISOString().split('T')[0];
            if (exclusions.includes(currentDateStr)) continue;

            const instanceLocalDate = new Date(currentDateStr + 'T12:00:00');
            const instanceDayOfWeek = instanceLocalDate.getDay();

            // Filter by selected days
            if (selectedDays.length > 0 && !selectedDays.includes(instanceDayOfWeek)) continue;

            // Avoid duplicating the original event
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
