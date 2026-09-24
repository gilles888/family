package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Recette type, sans ingrédients ni instructions (listes, recherche)")
public record RecipeSummaryDTO(
        @Schema(example = "1") Long id,
        @Schema(example = "Spaghetti bolognaise") String nom,
        @Schema(example = "Le classique du mercredi", nullable = true) String description,
        @Schema(example = "4") int portions,
        @Schema(description = "En minutes", example = "45", nullable = true) Integer tempsPreparation) {
}
