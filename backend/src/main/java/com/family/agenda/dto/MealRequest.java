package com.family.agenda.dto;

import com.family.agenda.dto.validation.ValidMealRequest;
import com.family.agenda.entity.MealSlot;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

@ValidMealRequest
@Schema(description = "Création / modification d'un repas : une recette (recetteId) OU un libellé libre, pas les deux",
        example = """
                { "date": "2026-09-24", "creneau": "SOUPER", "portions": 4, "recetteId": 1 }""")
public record MealRequest(
        @Schema(example = "2026-09-24") @NotNull LocalDate date,
        @Schema(example = "SOUPER") @NotNull MealSlot creneau,
        @Schema(example = "4") @NotNull @Min(1) @Max(50) Integer portions,
        @Schema(description = "Recette type (exclusif avec libelle)", example = "1") Long recetteId,
        @Schema(description = "Libellé libre, ex. « Restes », « Resto » (exclusif avec recetteId)", example = "Restes")
        @Size(max = 100) String libelle) {
}
