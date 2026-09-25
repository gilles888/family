package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Ajout au garde-manger", example = "{ \"nom\": \"Sel\" }")
public record PantryItemRequest(
        @Schema(example = "Sel") @NotBlank @Size(max = 100) String nom) {
}
