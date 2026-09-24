package com.family.agenda.service;

import com.family.agenda.config.MeteoProperties;
import com.family.agenda.dto.MeteoDTO;
import com.family.agenda.dto.MeteoJourDTO;
import com.family.agenda.exception.MeteoIndisponibleException;
import com.family.agenda.service.OpenMeteoClient.Forecast;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Météo d'aujourd'hui et de demain, gardée en mémoire {@code meteo.cache} (et jamais au-delà du jour).
 * Si Open-Meteo ne répond pas, la dernière prévision du jour est resservie ; sans elle : 503.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MeteoService {

    private final OpenMeteoClient client;
    private final TenueAdvisor advisor;
    private final MeteoProperties properties;
    private final Clock clock;

    private MeteoDTO cache;
    private LocalDate cacheJour;
    private Instant cacheInstant;

    /** Synchronisé : une seule requête vers Open-Meteo à la fois, les appels concurrents profitent du résultat. */
    public synchronized MeteoDTO getMeteo() {
        Instant maintenant = clock.instant();
        LocalDate aujourdhui = LocalDate.ofInstant(maintenant, properties.fuseau());
        boolean cacheDuJour = cache != null && aujourdhui.equals(cacheJour);
        if (cacheDuJour && maintenant.isBefore(cacheInstant.plus(properties.cache()))) {
            return cache;
        }
        try {
            cache = construire(client.forecast(), aujourdhui);
            cacheJour = aujourdhui;
            cacheInstant = maintenant;
            return cache;
        } catch (RuntimeException ex) {
            if (cacheDuJour) {
                log.warn("Open-Meteo indisponible, prévision en cache resservie : {}", ex.toString());
                return cache;
            }
            log.warn("Open-Meteo indisponible et aucune prévision du jour en cache", ex);
            throw new MeteoIndisponibleException(ex);
        }
    }

    private MeteoDTO construire(Forecast forecast, LocalDate aujourdhui) {
        List<MeteoJourDTO> jours = List.of(
                advisor.analyser(aujourdhui, forecast),
                advisor.analyser(aujourdhui.plusDays(1), forecast));
        return new MeteoDTO(properties.lieu(), jours);
    }
}
