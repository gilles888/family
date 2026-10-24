package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Changement de son propre mot de passe")
public record PasswordChangeRequest(
        @NotBlank @Size(max = AccountRules.MOT_DE_PASSE_MAX) String ancienMotDePasse,
        @Schema(description = "10 caractères minimum")
        @NotBlank @Size(min = AccountRules.MOT_DE_PASSE_MIN, max = AccountRules.MOT_DE_PASSE_MAX,
                message = "doit contenir de 10 à 128 caractères")
        String nouveauMotDePasse) {

    @Override
    public String toString() {
        return "PasswordChangeRequest[***]";
    }
}
