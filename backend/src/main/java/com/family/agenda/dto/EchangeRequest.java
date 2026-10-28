package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Schema(description = "Échange d'étoiles contre des pièces d'or")
public record EchangeRequest(
        @Schema(description = "Nombre de pièces voulues (chacune coûte « étoiles par pièce » étoiles)", example = "2")
        @Min(1) @Max(1000) int pieces) {
}
