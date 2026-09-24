package com.family.agenda.dto;

import com.family.agenda.entity.IngredientUnit;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

@Schema(description = "Ligne d'ingrédient d'une recette. L'ingrédient est désigné par son nom : créé s'il n'existe pas encore.")
public record RecipeIngredientRequest(
        @Schema(example = "Tomates pelées") @NotBlank @Size(max = 100) String nom,
        @Schema(example = "400") @NotNull @Positive @Digits(integer = 7, fraction = 3) BigDecimal quantite,
        @Schema(example = "G") @NotNull IngredientUnit unite) {
}
