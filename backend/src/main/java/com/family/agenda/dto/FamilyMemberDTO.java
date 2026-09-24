package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Membre de la famille")
public record FamilyMemberDTO(
        @Schema(example = "1") Long id,
        @Schema(example = "Léa") String nom,
        @Schema(example = "#E91E63") String couleur) {
}
