package com.family.agenda.dto;

import com.family.agenda.entity.StarPenaltyReason;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

@Schema(description = "Étoiles retirées à un membre")
public record StarPenaltyDTO(
        Long id,
        @Schema(example = "2026-09-24") LocalDate date,
        @Schema(example = "2") int nombre,
        StarPenaltyReason motif,
        @Schema(nullable = true) String commentaire) {
}
