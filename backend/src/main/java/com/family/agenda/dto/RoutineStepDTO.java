package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Étape d'une routine")
public record RoutineStepDTO(
        @Schema(example = "12") Long id,
        @Schema(description = "Ordre (0 = première étape)", example = "2") int position,
        @Schema(example = "Ik poets mijn tanden.") String libelle,
        @Schema(description = "Illustration du catalogue du front", example = "toothbrush") String icone,
        @Schema(description = "Couleur pastel de la ligne", example = "#FDE2E4") String couleur) {
}
