package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Vue annuelle : nombre d'entrées par mois, groupées par type")
public record YearSummaryDTO(
        @Schema(example = "2026") int annee,
        @Schema(description = "Nombre total d'entrées de l'année", example = "42") long total,
        @Schema(description = "12 éléments, de janvier à décembre") List<MonthSummaryDTO> mois) {
}
