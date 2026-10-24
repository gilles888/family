package com.family.agenda.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/**
 * @param cookieSecure     cookies de session, XSRF-TOKEN et « rester connecté » marqués Secure (HTTPS) ; false en dev
 * @param rememberMeKey    clé des jetons « rester connecté » ; vide = aléatoire à chaque démarrage (les jetons sont
 *                         vérifiés en base, ils restent valides)
 * @param rememberMeDuree  durée de « rester connecté »
 * @param maxEchecs        échecs consécutifs avant blocage
 * @param dureeBlocage     durée du blocage
 */
@ConfigurationProperties(prefix = "agenda.security")
public record AuthProperties(
        @DefaultValue("true") boolean cookieSecure,
        @DefaultValue("") String rememberMeKey,
        @DefaultValue("30d") Duration rememberMeDuree,
        @DefaultValue("5") int maxEchecs,
        @DefaultValue("15m") Duration dureeBlocage) {
}
