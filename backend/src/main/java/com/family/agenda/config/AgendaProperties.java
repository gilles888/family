package com.family.agenda.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Paramètres de génération des AgendaEntry (préfixe {@code agenda.generation}).
 *
 * @param horizonMonths nombre de mois d'occurrences générés à l'avance pour les reminders récurrents
 * @param cron          planification (Spring cron, 6 champs) du job nocturne de prolongation
 */
@Validated
@ConfigurationProperties(prefix = "agenda.generation")
public record AgendaProperties(
        @DefaultValue("6") @Min(1) int horizonMonths,
        @DefaultValue("0 0 2 * * *") String cron) {
}
