package com.family.agenda.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Premier compte parent, créé au démarrage si aucun compte n'existe (variables ADMIN_USERNAME / ADMIN_PASSWORD).
 * Hors profil dev, leur absence sur une base sans compte empêche le démarrage.
 */
@ConfigurationProperties(prefix = "agenda.admin")
public record AdminProperties(String username, String password) {

    @Override
    public String toString() {
        return "AdminProperties[username=%s, password=***]".formatted(username);
    }
}
