package com.family.agenda.config;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import java.time.ZoneId;

/**
 * Paramètres de la carte météo (préfixe {@code meteo}). Le dépôt est public : les coordonnées par défaut
 * sont celles du centre de Bruxelles, celles du domicile se passent par variables d'environnement.
 *
 * @param lieu        nom affiché du lieu
 * @param latitude    latitude du lieu
 * @param longitude   longitude du lieu
 * @param fuseau      fuseau des prévisions et du changement de jour
 * @param heureDepart heure de départ à l'école : ressenti « du matin » et début de la fenêtre de pluie
 * @param cache       durée de conservation d'une prévision en mémoire
 * @param baseUrl     URL de l'API Open-Meteo
 */
@Validated
@ConfigurationProperties(prefix = "meteo")
public record MeteoProperties(
        @DefaultValue("Bruxelles") @NotBlank String lieu,
        @DefaultValue("50.85") @DecimalMin("-90") @DecimalMax("90") double latitude,
        @DefaultValue("4.35") @DecimalMin("-180") @DecimalMax("180") double longitude,
        @DefaultValue("Europe/Brussels") @NotNull ZoneId fuseau,
        @DefaultValue("8") @Min(0) @Max(23) int heureDepart,
        @DefaultValue("30m") @NotNull Duration cache,
        @DefaultValue("https://api.open-meteo.com") @NotBlank String baseUrl) {
}
