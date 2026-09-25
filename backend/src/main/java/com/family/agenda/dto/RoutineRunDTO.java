package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "État d'une routine pour un jour (les coches repartent de zéro chaque jour)")
public record RoutineRunDTO(
        @Schema(example = "2026-09-25") LocalDate date,
        @Schema(description = "Ids des étapes cochées") List<Long> etapesCochees,
        @Schema(description = "Toutes les étapes sont cochées") boolean terminee,
        @Schema(description = "Moment où la dernière étape a été cochée", nullable = true) LocalDateTime termineeLe,
        @Schema(description = "La récompense du jour (mini-jeu) a été jouée") boolean recompenseJouee) {
}
