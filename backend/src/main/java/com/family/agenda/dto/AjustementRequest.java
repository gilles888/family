package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Ajustement manuel des pièces d'un membre (parent)")
public record AjustementRequest(
        @Schema(description = "Pièces ajoutées (positif) ou retirées (négatif), non nul", example = "-2") @Min(-1000) @Max(1000) int pieces,
        @Schema(description = "Motif, obligatoire", example = "Pièces rendues après une erreur") @NotBlank @Size(max = 255) String commentaire) {
}
