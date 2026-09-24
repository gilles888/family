package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Création / modification d'une recette type",
        example = """
                {
                  "nom": "Spaghetti bolognaise",
                  "description": "Le classique du mercredi",
                  "portions": 4,
                  "tempsPreparation": 45,
                  "instructions": "Faire revenir l'oignon.\\nAjouter la viande, puis les tomates.\\nLaisser mijoter 30 min.",
                  "ingredients": [
                    { "nom": "Spaghetti", "quantite": 400, "unite": "G" },
                    { "nom": "Haché bœuf", "quantite": 500, "unite": "G" },
                    { "nom": "Tomates pelées", "quantite": 1, "unite": "BOITE" }
                  ]
                }""")
public record RecipeRequest(
        @NotBlank @Size(max = 150) String nom,
        @Schema(description = "Description courte") @Size(max = 500) String description,
        @Schema(description = "Portions pour lesquelles les quantités sont données", example = "4")
        @NotNull @Min(1) @Max(100) Integer portions,
        @Schema(description = "Temps de préparation en minutes (optionnel)", example = "45")
        @Min(1) @Max(1440) Integer tempsPreparation,
        @Schema(description = "Instructions, texte libre multi-lignes") @Size(max = 10000) String instructions,
        @Schema(description = "Ingrédients, dans l'ordre d'affichage ; absent = aucun")
        @Size(max = 100) List<@NotNull @Valid RecipeIngredientRequest> ingredients) {
}
