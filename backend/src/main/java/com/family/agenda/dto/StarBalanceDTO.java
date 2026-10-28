package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Étoiles d'un membre depuis le début : gagnées, retirées et solde")
public record StarBalanceDTO(
        @Schema(description = "Étoiles gagnées (une par routine terminée)", example = "12") long gagnees,
        @Schema(description = "Étoiles retirées par un parent", example = "3") long retirees,
        @Schema(description = "Gagnées moins retirées, jamais négatif", example = "9") long solde) {
}
