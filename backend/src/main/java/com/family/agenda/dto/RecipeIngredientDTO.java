package com.family.agenda.dto;

import com.family.agenda.entity.Aisle;
import com.family.agenda.entity.IngredientUnit;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "Ingrédient d'une recette, avec sa quantité")
public record RecipeIngredientDTO(
        @Schema(example = "3") Long ingredientId,
        @Schema(example = "Tomates pelées") String nom,
        @Schema(example = "EPICERIE", nullable = true) Aisle rayon,
        @Schema(example = "400") BigDecimal quantite,
        @Schema(example = "G") IngredientUnit unite) {
}
