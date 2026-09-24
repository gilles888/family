package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Reminder créé/modifié + résumé des AgendaEntry générées")
public record ReminderWithAgendaDTO(
        ReminderDTO reminder,
        @Schema(description = "Résumé des entrées d'agenda liées au reminder") AgendaGenerationSummaryDTO agenda) {
}
