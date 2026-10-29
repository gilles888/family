package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Schema(description = "Réglages de la boutique")
public record BoutiqueSettingsDTO(
        @Schema(description = "Étoiles à échanger pour une pièce d'or", example = "10") @Min(1) @Max(1000) int etoilesParPiece) {
}
