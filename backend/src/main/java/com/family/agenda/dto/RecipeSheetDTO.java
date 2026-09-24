package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Fiche recette : quantités recalculées pour un nombre de portions donné")
public record RecipeSheetDTO(
        @Schema(example = "1") Long id,
        @Schema(example = "Spaghetti bolognaise") String nom,
        @Schema(nullable = true) String description,
        @Schema(description = "Portions de référence de la recette", example = "4") int portionsRecette,
        @Schema(description = "Portions demandées : les quantités sont calculées pour ce nombre", example = "6") int portions,
        @Schema(description = "En minutes", example = "45", nullable = true) Integer tempsPreparation,
        @Schema(nullable = true) String instructions,
        @Schema(description = "Quantités au prorata, arrondies à 2 décimales") List<RecipeIngredientDTO> ingredients) {
}
