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
import java.util.ArrayList;
import java.util.List;

/**
 * Météo des 7 prochains jours, gardée en mémoire {@code meteo.cache} (et jamais au-delà du jour) : la carte
 * (2 jours) et le dialogue semaine (7 jours) partagent la même prévision et le même appel à Open-Meteo.
 * Si Open-Meteo ne répond pas, la dernière prévision du jour est resservie ; sans elle : 503.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MeteoService {

    /** Nombre maximal de jours servis (aujourd'hui compris). */
    public static final int JOURS_MAX = OpenMeteoClient.FORECAST_DAYS;

    private final OpenMeteoClient client;
    private final TenueAdvisor advisor;
    private final MeteoProperties properties;
    private final Clock clock;

    private MeteoDTO cache;
    private LocalDate cacheJour;
    private Instant cacheInstant;

    /**
     * Les {@code nbJours} premiers jours (aujourd'hui compris, 1 à {@link #JOURS_MAX}). Moins si Open-Meteo en
     * a fourni moins.
     */
    public MeteoDTO meteo(int nbJours) {
        if (nbJours < 1 || nbJours > JOURS_MAX) {
            throw new IllegalArgumentException("nbJours doit être compris entre 1 et " + JOURS_MAX + " : " + nbJours);
        }
        MeteoDTO semaine = semaine();
        List<MeteoJourDTO> jours = semaine.jours();
        return new MeteoDTO(semaine.lieu(), jours.subList(0, Math.min(nbJours, jours.size())));
    }

    /** Synchronisé : une seule requête vers Open-Meteo à la fois, les appels concurrents profitent du résultat. */
    private synchronized MeteoDTO semaine() {
        Instant maintenant = clock.instant();
        LocalDate aujourdhui = LocalDate.ofInstant(maintenant, properties.fuseau());
        boolean cacheDuJour = cache != null && aujourdhui.equals(cacheJour);
        if (cacheDuJour && maintenant.isBefore(cacheInstant.plus(properties.cache()))) {
            return cache;
        }
        try {
            cache = construire(client.previsionSemaine(), aujourdhui);
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

    /** Jours consécutifs à partir d'aujourd'hui, tant que la prévision les contient ; aujourd'hui est obligatoire. */
    private MeteoDTO construire(Forecast forecast, LocalDate aujourdhui) {
        List<MeteoJourDTO> jours = new ArrayList<>();
        jours.add(advisor.analyser(aujourdhui, forecast));
        List<LocalDate> dates = forecast.daily().time();
        for (int i = 1; i < JOURS_MAX && dates.contains(aujourdhui.plusDays(i)); i++) {
            jours.add(advisor.analyser(aujourdhui.plusDays(i), forecast));
        }
        return new MeteoDTO(properties.lieu(), List.copyOf(jours));
    }
}
