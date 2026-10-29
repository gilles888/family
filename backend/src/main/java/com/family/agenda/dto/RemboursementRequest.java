package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Remboursement d'un article (parent)")
public record RemboursementRequest(
        @Schema(example = "costume-witch") @NotBlank @Size(max = 60) String articleId,
        @Schema(description = "Motif, facultatif", nullable = true) @Size(max = 255) String commentaire) {
}
