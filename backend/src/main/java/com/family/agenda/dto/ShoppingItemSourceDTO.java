package com.family.agenda.dto;

import com.family.agenda.entity.MealSlot;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

@Schema(description = "Repas à l'origine d'une ligne générée (« pour : lasagnes lundi »)")
public record ShoppingItemSourceDTO(
        @Schema(description = "Id du repas au moment de la génération (il a pu être supprimé depuis)", example = "12")
        Long repasId,
        @Schema(example = "2026-09-21") LocalDate date,
        @Schema(example = "SOUPER") MealSlot creneau,
        @Schema(description = "Nom de la recette", example = "Lasagnes") String titre) {
}
