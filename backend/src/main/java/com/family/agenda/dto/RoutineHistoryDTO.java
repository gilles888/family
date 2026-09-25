package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.util.List;

@Schema(description = "Routines terminées d'un jour (historique)")
public record RoutineHistoryDTO(
        @Schema(example = "2026-09-24") LocalDate date,
        @Schema(description = "Ids des routines terminées ce jour-là") List<Long> routinesTerminees) {
}
