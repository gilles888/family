package com.family.agenda.config;

import com.family.agenda.entity.AccountRole;
import com.family.agenda.service.AccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Premier compte parent, uniquement si aucun compte n'existe : ADMIN_USERNAME / ADMIN_PASSWORD. Sans ces variables,
 * le démarrage est refusé, sauf en profil dev (compte « admin » / « admin-dev-1234 », avec un avertissement).
 * Passe avant le seed (famille.json), qui peut compléter ce compte (rôle, membre lié).
 */
@Component
@Order(0)
@RequiredArgsConstructor
@Slf4j
public class AdminAccountInitializer implements CommandLineRunner {

    static final String DEV_USERNAME = "admin";
    static final String DEV_PASSWORD = "admin-dev-1234";

    private final AccountService accountService;
    private final AdminProperties properties;
    private final Environment environment;

    @Override
    public void run(String... args) {
        if (!accountService.isEmpty()) {
            return;
        }
        String username = properties.username();
        String password = properties.password();
        if (blank(username) || blank(password)) {
            if (!environment.matchesProfiles("dev")) {
                throw new IllegalStateException("Aucun compte utilisateur : définissez ADMIN_USERNAME et ADMIN_PASSWORD "
                        + "(10 caractères minimum) pour créer le premier compte parent.");
            }
            username = DEV_USERNAME;
            password = DEV_PASSWORD;
            log.warn("Profil dev : compte « {} » / « {} » créé. Ne jamais l'utiliser en production.", DEV_USERNAME, DEV_PASSWORD);
        }
        try {
            accountService.newAccount(username, AccountRole.PARENT, null, password, false);
        } catch (RuntimeException e) {
            throw new IllegalStateException("Compte administrateur (ADMIN_USERNAME / ADMIN_PASSWORD) refusé : " + e.getMessage(), e);
        }
        log.info("Compte administrateur « {} » créé", AccountService.normalize(username));
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
