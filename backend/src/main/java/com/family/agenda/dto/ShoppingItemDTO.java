package com.family.agenda.dto;

import com.family.agenda.entity.Aisle;
import com.family.agenda.entity.IngredientUnit;
import com.family.agenda.entity.ShoppingItemOrigin;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;

@Schema(description = "Ligne de la liste de courses")
public record ShoppingItemDTO(
        @Schema(example = "7") Long id,
        @Schema(example = "Tomates") String nom,
        @Schema(description = "Absente pour un article sans quantité", example = "700", nullable = true) BigDecimal quantite,
        @Schema(example = "G", nullable = true) IngredientUnit unite,
        @Schema(description = "Rayon de l'ingrédient, s'il est connu", example = "FRUITS_LEGUMES", nullable = true)
        Aisle rayon,
        @Schema(description = "GENERE (depuis les repas) ou MANUEL", example = "GENERE") ShoppingItemOrigin origine,
        @Schema(description = "Coché en magasin") boolean achete,
        @Schema(description = "Déjà à la maison : exclu des achats") boolean aLaMaison,
        @Schema(description = "Ligne générée modifiée à la main : la régénération garde sa quantité") boolean modifie,
        @Schema(description = "Repas qui utilisent cet ingrédient (vide pour un article manuel)")
        List<ShoppingItemSourceDTO> sources) {
}
