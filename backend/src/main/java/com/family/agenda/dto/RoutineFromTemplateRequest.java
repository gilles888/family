package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Schema(description = "Copier un modèle de routine chez un membre", example = "{ \"modele\": \"matin\", \"langue\": \"nl\" }")
public record RoutineFromTemplateRequest(
        @Schema(description = "matin ou soir", example = "matin") @NotBlank String modele,
        @Schema(description = "Langue des libellés : fr ou nl", example = "nl") @NotBlank @Pattern(regexp = "^(fr|nl)$") String langue) {
}
