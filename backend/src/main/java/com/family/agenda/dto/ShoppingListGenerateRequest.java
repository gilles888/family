package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

@Schema(description = "Période des repas à prendre en compte (jours inclus)",
        example = "{ \"dateDebut\": \"2026-09-25\", \"dateFin\": \"2026-10-02\" }")
public record ShoppingListGenerateRequest(
        @Schema(example = "2026-09-25") @NotNull LocalDate dateDebut,
        @Schema(example = "2026-10-02") @NotNull LocalDate dateFin) {
}
