package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Achat (ou cadeau d'un parent) d'un article de la boutique")
public record AchatRequest(
        @Schema(description = "Id de l'article", example = "costume-witch") @NotBlank @Size(max = 60) String articleId) {
}
