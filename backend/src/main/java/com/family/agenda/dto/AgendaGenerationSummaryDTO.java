package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "Résumé des AgendaEntry d'un reminder (générées à la création ou à la modification)")
public record AgendaGenerationSummaryDTO(
        @Schema(description = "Nombre d'entrées d'agenda liées au reminder", example = "26") long nombre,
        @Schema(description = "Date/heure de la première entrée (null si aucune)", example = "2026-09-22T18:00:00")
        LocalDateTime premiereDate,
        @Schema(description = "Date/heure de la dernière entrée (null si aucune)", example = "2027-03-18T18:00:00")
        LocalDateTime derniereDate) {
}
