package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Recette type")
public record RecipeDTO(
        @Schema(example = "1") Long id,
        @Schema(example = "Spaghetti bolognaise") String nom,
        @Schema(example = "Le classique du mercredi", nullable = true) String description,
        @Schema(description = "Portions pour lesquelles les quantités sont données", example = "4") int portions,
        @Schema(description = "En minutes", example = "45", nullable = true) Integer tempsPreparation,
        @Schema(nullable = true) String instructions,
        @Schema(description = "Dans l'ordre d'affichage") List<RecipeIngredientDTO> ingredients) {
}
