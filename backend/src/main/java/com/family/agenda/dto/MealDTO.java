package com.family.agenda.dto;

import com.family.agenda.entity.MealSlot;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

@Schema(description = "Repas planifié")
public record MealDTO(
        @Schema(example = "12") Long id,
        @Schema(example = "2026-09-24") LocalDate date,
        @Schema(example = "SOUPER") MealSlot creneau,
        @Schema(example = "4") int portions,
        @Schema(description = "Recette type, absente pour un libellé libre", example = "1", nullable = true) Long recetteId,
        @Schema(description = "Libellé libre, absent si une recette est choisie", nullable = true) String libelle,
        @Schema(description = "À afficher : nom de la recette ou libellé libre", example = "Spaghetti bolognaise") String titre) {
}
