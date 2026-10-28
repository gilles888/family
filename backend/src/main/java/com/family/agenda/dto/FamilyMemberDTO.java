package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.util.Map;

@Schema(description = "Membre de la famille")
public record FamilyMemberDTO(
        @Schema(example = "1") Long id,
        @Schema(example = "Léa") String nom,
        @Schema(example = "#E91E63") String couleur,
        @Schema(description = "Personnage (avatar) : configuration libre du catalogue front, absente = avatar par défaut",
                example = "{\"version\": 1, \"skin\": \"skin-3\", \"hair\": \"hair-curly\", \"hairColor\": \"#6b3e26\"}",
                nullable = true)
        Map<String, Object> avatarConfig,
        @Schema(description = "Date de naissance (facultative)", example = "2017-03-14", nullable = true) LocalDate dateNaissance,
        @Schema(description = "Porter automatiquement la tenue enregistrée pour le thème du moment") boolean tenueAuto,
        @Schema(description = "Tenues de thème : config du personnage par thème (HALLOWEEN, NOEL…), absent = aucune")
        Map<String, Map<String, Object>> tenues) {
}
