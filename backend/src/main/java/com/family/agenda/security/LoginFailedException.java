package com.family.agenda.security;

import java.time.LocalDateTime;

/** Connexion refusée (HTTP 401). Le message ne dit jamais si l'identifiant existe. */
public class LoginFailedException extends RuntimeException {

    public enum Code {
        /** Identifiant inconnu ou mot de passe faux : même réponse dans les deux cas. */
        IDENTIFIANTS_INVALIDES,
        /** Trop d'échecs : bloqué jusqu'à {@link #getBloqueJusqua()} (identifiant connu ou non). */
        COMPTE_BLOQUE,
        /** Mot de passe juste, mais compte désactivé. */
        COMPTE_DESACTIVE
    }

    private final Code code;
    private final LocalDateTime bloqueJusqua;

    public LoginFailedException(Code code, LocalDateTime bloqueJusqua) {
        super(switch (code) {
            case IDENTIFIANTS_INVALIDES -> "Identifiant ou mot de passe incorrect";
            case COMPTE_BLOQUE -> "Trop de tentatives : connexion bloquée temporairement";
            case COMPTE_DESACTIVE -> "Ce compte est désactivé";
        });
        this.code = code;
        this.bloqueJusqua = bloqueJusqua;
    }

    public Code getCode() {
        return code;
    }

    public LocalDateTime getBloqueJusqua() {
        return bloqueJusqua;
    }
}
