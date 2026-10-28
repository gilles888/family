package com.family.agenda.dto;

import com.family.agenda.entity.CoinTransactionType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "Mouvement de pièces d'un membre")
public record CoinTransactionDTO(
        Long id,
        CoinTransactionType type,
        @Schema(description = "Signé : positif = gagnées, négatif = dépensées", example = "-5") int pieces,
        @Schema(description = "Étoiles échangées (type ECHANGE)", nullable = true) Integer etoiles,
        @Schema(nullable = true) String articleId,
        @Schema(nullable = true) String commentaire,
        LocalDateTime creeLe) {
}
