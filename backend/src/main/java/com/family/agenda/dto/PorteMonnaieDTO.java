package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Étoiles disponibles et pièces d'or d'un membre")
public record PorteMonnaieDTO(
        @Schema(description = "Étoiles disponibles : gagnées − retirées − échangées, jamais négatif", example = "23") long etoilesDisponibles,
        @Schema(description = "Pièces d'or", example = "2") int pieces,
        @Schema(description = "Taux de change : étoiles pour une pièce", example = "10") int etoilesParPiece,
        @Schema(description = "Étoiles déjà échangées contre des pièces", example = "20") long etoilesConverties) {
}
