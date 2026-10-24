package com.family.agenda.dto;

/** Règles des comptes partagées par la validation des requêtes et le service. */
public final class AccountRules {

    public static final int MOT_DE_PASSE_MIN = 10;
    /** Borne haute : le hachage Argon2 d'un texte immense coûterait cher. */
    public static final int MOT_DE_PASSE_MAX = 128;
    /** Identifiant normalisé (minuscules). */
    public static final String IDENTIFIANT = "^[a-z0-9][a-z0-9._-]{2,49}$";

    private AccountRules() {
    }
}
