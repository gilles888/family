package com.family.agenda.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Données de départ (préfixe {@code agenda.seed}).
 *
 * @param enabled créer les données de départ au démarrage, sur une base sans membre
 * @param fichier famille réelle (JSON, hors du dépôt) ; absent = famille fictive de démonstration
 */
@ConfigurationProperties(prefix = "agenda.seed")
public record SeedProperties(
        @DefaultValue("false") boolean enabled,
        @DefaultValue("./famille.json") String fichier) {
}
