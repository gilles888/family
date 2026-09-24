package com.family.agenda.dto;

import com.family.agenda.entity.Aisle;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Ingrédient réutilisable entre recettes")
public record IngredientDTO(
        @Schema(example = "3") Long id,
        @Schema(example = "Tomates pelées") String nom,
        @Schema(description = "Rayon du magasin (optionnel)", example = "EPICERIE", nullable = true) Aisle rayon) {
}
