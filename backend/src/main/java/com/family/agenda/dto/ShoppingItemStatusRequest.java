package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Statuts à changer ; un champ absent reste inchangé", example = "{ \"achete\": true }")
public record ShoppingItemStatusRequest(
        @Schema(description = "Coché en magasin", nullable = true) Boolean achete,
        @Schema(description = "Déjà à la maison : exclu des achats", nullable = true) Boolean aLaMaison) {
}
