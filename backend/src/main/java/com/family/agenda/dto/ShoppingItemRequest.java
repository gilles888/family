package com.family.agenda.dto;

import com.family.agenda.entity.IngredientUnit;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

@Schema(description = "Article ajouté ou modifié à la main. Quantité et unité facultatives ; pas d'unité sans quantité.",
        example = "{ \"nom\": \"Lait\", \"quantite\": 2, \"unite\": \"L\" }")
public record ShoppingItemRequest(
        @Schema(example = "Lait") @NotBlank @Size(max = 100) String nom,
        @Schema(example = "2", nullable = true) @Positive @Digits(integer = 7, fraction = 3) BigDecimal quantite,
        @Schema(example = "L", nullable = true) IngredientUnit unite) {
}
