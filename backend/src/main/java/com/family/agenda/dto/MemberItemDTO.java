package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "Article payant possédé par un membre")
public record MemberItemDTO(
        @Schema(example = "costume-witch") String articleId,
        LocalDateTime acquisLe,
        @Schema(description = "Prix payé, 0 pour un cadeau", example = "5") int prixPaye) {
}
