package com.family.agenda.dto;

import com.family.agenda.entity.AccountRole;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Utilisateur connecté")
public record MeDTO(
        @Schema(example = "lea") String identifiant,
        @Schema(example = "ENFANT") AccountRole role,
        @Schema(description = "Membre de la famille lié", example = "4", nullable = true) Long membreId,
        @Schema(example = "Léa", nullable = true) String membreNom,
        @Schema(description = "Vrai : seul le changement de mot de passe est possible") boolean doitChangerMotDePasse) {
}
