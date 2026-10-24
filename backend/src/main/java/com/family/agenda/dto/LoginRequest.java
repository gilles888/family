package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Connexion")
public record LoginRequest(
        @Schema(example = "lea") @NotNull @Size(max = 100) String identifiant,
        @NotNull @Size(max = AccountRules.MOT_DE_PASSE_MAX) String motDePasse,
        @Schema(description = "Rester connecté 30 jours sur cet appareil") Boolean resterConnecte) {

    @Override
    public String toString() {
        return "LoginRequest[identifiant=%s, resterConnecte=%s]".formatted(identifiant, resterConnecte);
    }
}
