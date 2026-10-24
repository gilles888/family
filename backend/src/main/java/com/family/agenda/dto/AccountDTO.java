package com.family.agenda.dto;

import com.family.agenda.entity.AccountRole;
import com.family.agenda.entity.UserAccount;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "Compte de connexion (jamais de mot de passe ni d'empreinte)")
public record AccountDTO(
        @Schema(example = "3") Long id,
        @Schema(example = "lea") String identifiant,
        @Schema(example = "ENFANT") AccountRole role,
        @Schema(description = "Membre de la famille lié", example = "4", nullable = true) Long membreId,
        @Schema(description = "Désactivé = connexion refusée") boolean actif,
        @Schema(description = "Faux tant qu'un parent n'a pas défini de mot de passe") boolean motDePasseDefini,
        @Schema(description = "Le mot de passe doit être changé à la prochaine connexion") boolean doitChangerMotDePasse,
        @Schema(description = "Bloqué après 5 échecs de connexion, jusqu'à cette date", nullable = true)
        LocalDateTime bloqueJusqua,
        @Schema(nullable = true) LocalDateTime derniereConnexion,
        LocalDateTime creeLe) {

    public static AccountDTO from(UserAccount a) {
        return new AccountDTO(a.getId(), a.getIdentifiant(), a.getRole(), a.getMemberId(), a.isActif(),
                a.getPasswordHash() != null, a.isDoitChangerMotDePasse(), a.getBloqueJusqua(), a.getDerniereConnexion(),
                a.getCreeLe());
    }
}
