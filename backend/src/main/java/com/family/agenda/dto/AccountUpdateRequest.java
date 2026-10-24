package com.family.agenda.dto;

import com.family.agenda.entity.AccountRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Modification d'un compte par un parent : rôle, membre lié, activation")
public record AccountUpdateRequest(
        @Schema(example = "ENFANT") @NotNull AccountRole role,
        @Schema(example = "4", nullable = true) Long membreId,
        @Schema(description = "Faux = désactivé : connexion refusée, sessions et « rester connecté » révoqués")
        @NotNull Boolean actif) {
}
