package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Article du garde-manger : toujours à la maison")
public record PantryItemDTO(
        @Schema(example = "1") Long id,
        @Schema(example = "Sel") String nom) {
}
