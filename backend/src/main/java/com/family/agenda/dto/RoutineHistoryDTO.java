package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.util.List;

@Schema(description = "Étoiles d'un jour (historique) : routines terminées et étoiles retirées")
public record RoutineHistoryDTO(
        @Schema(example = "2026-09-24") LocalDate date,
        @Schema(description = "Ids des routines terminées ce jour-là (une étoile chacune)") List<Long> routinesTerminees,
        @Schema(description = "Étoiles retirées ce jour-là") List<StarPenaltyDTO> retraits) {
}
