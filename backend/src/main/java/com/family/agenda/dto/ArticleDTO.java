package com.family.agenda.dto;

import com.family.agenda.entity.Saison;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Article de la boutique (pièce du personnage)")
public record ArticleDTO(
        @Schema(description = "Id de la pièce dans le catalogue du front", example = "costume-witch") String id,
        @Schema(description = "Emplacement : champ de la config du personnage (costume, hat, face, back, held…)", example = "costume") String emplacement,
        @Schema(description = "Prix en pièces d'or ; 0 = gratuit, possédé d'office", example = "5") int prix,
        @Schema(description = "commun, rare ou super", example = "super") String rarete,
        @Schema(description = "Thème de l'article, absent = toute l'année", nullable = true) Saison theme) {
}
