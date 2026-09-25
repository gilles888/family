package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Étape d'une routine. Avec un id : étape existante (ses coches du jour sont gardées) ; sans : nouvelle étape.")
public record RoutineStepRequest(
        @Schema(example = "12", nullable = true) Long id,
        @Schema(example = "Ik poets mijn tanden.") @NotBlank @Size(max = 150) String libelle,
        @Schema(example = "toothbrush") @NotBlank @Pattern(regexp = "^[a-z0-9-]{1,40}$") String icone,
        @Schema(description = "Couleur de la ligne #RRGGBB ; absente = couleur pastel suivante", example = "#FDE2E4",
                nullable = true)
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "doit être une couleur hexadécimale #RRGGBB") String couleur) {
}
