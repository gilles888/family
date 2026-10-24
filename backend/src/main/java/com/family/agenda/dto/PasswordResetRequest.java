package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Nouveau mot de passe défini par un parent (à changer à la prochaine connexion)")
public record PasswordResetRequest(
        @Schema(description = "10 caractères minimum")
        @NotBlank @Size(min = AccountRules.MOT_DE_PASSE_MIN, max = AccountRules.MOT_DE_PASSE_MAX,
                message = "doit contenir de 10 à 128 caractères")
        String motDePasse) {

    @Override
    public String toString() {
        return "PasswordResetRequest[***]";
    }
}
