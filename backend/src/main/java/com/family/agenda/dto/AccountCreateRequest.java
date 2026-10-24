package com.family.agenda.dto;

import com.family.agenda.entity.AccountRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Création d'un compte par un parent")
public record AccountCreateRequest(
        @Schema(description = "3 à 50 caractères : lettres, chiffres, point, tiret, souligné (insensible à la casse)",
                example = "lea")
        @NotBlank @Size(max = 50) String identifiant,
        @Schema(example = "ENFANT") @NotNull AccountRole role,
        @Schema(description = "Membre de la famille lié (obligatoire pour un enfant)", example = "4", nullable = true)
        Long membreId,
        @Schema(description = "Mot de passe initial (10 caractères minimum), à changer à la première connexion ; "
                + "absent = compte inactif tant qu'un mot de passe n'est pas défini", nullable = true)
        @Size(min = AccountRules.MOT_DE_PASSE_MIN, max = AccountRules.MOT_DE_PASSE_MAX,
                message = "doit contenir de 10 à 128 caractères")
        String motDePasse) {

    @Override
    public String toString() {
        return "AccountCreateRequest[identifiant=%s, role=%s, membreId=%s]".formatted(identifiant, role, membreId);
    }
}
