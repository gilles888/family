package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Membre de la famille")
public record FamilyMemberDTO(
        @Schema(example = "1") Long id,
        @Schema(example = "Léa") String nom,
        @Schema(example = "#E91E63") String couleur,
        @Schema(description = "Personnage (avatar) : configuration libre du catalogue front, absente = avatar par défaut",
                example = "{\"version\": 1, \"skin\": \"skin-3\", \"hair\": \"hair-curly\", \"hairColor\": \"#6b3e26\"}",
                nullable = true)
        Map<String, Object> avatarConfig) {
}
