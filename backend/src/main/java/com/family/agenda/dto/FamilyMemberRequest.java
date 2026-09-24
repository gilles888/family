package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Création / modification d'un membre de la famille")
public record FamilyMemberRequest(
        @Schema(description = "Nom affiché", example = "Léa")
        @NotBlank @Size(max = 100) String nom,
        @Schema(description = "Couleur hexadécimale #RRGGBB", example = "#E91E63")
        @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "doit être une couleur hexadécimale #RRGGBB")
        String couleur) {
}
