package com.family.agenda.dto;

import com.family.agenda.entity.StarPenaltyReason;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

@Schema(description = "Retrait d'étoiles")
public record StarPenaltyRequest(
        @Schema(description = "Nombre d'étoiles retirées", example = "2")
        @NotNull @Min(1) @Max(50) Integer nombre,
        @NotNull StarPenaltyReason motif,
        @Schema(description = "Obligatoire si le motif est AUTRE", example = "A claqué la porte")
        @Size(max = 255) String commentaire,
        @Schema(description = "Jour du retrait (aujourd'hui par défaut ; pas dans le futur)", example = "2026-09-24")
        LocalDate date) {
}
