package com.family.agenda.service;

import com.family.agenda.config.MeteoProperties;
import com.family.agenda.dto.Ciel;
import com.family.agenda.dto.MeteoJourDTO;
import com.family.agenda.dto.Vetement;
import com.family.agenda.service.OpenMeteoClient.Daily;
import com.family.agenda.service.OpenMeteoClient.Forecast;
import com.family.agenda.service.OpenMeteoClient.Hourly;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

/**
 * Traduit une prévision en tenue conseillée pour les enfants. Logique pure (aucun appel réseau, aucune horloge).
 * <p>
 * Les règles portent sur la température <b>ressentie</b> : celle du matin (heure de départ), qui décide des
 * couches chaudes, et la plus haute de la journée (10 h – 18 h), qui décide du short et du pull.
 */
@Component
public class TenueAdvisor {

    static final int HEURE_DEBUT_JOURNEE = 10;
    static final int HEURE_FIN_JOURNEE = 18;

    static final double PULL_SI_MATIN_SOUS = 15;
    static final double PULL_SI_JOURNEE_SOUS = 18;
    static final double MANTEAU_SI_MATIN_SOUS = 8;
    static final double VESTE_SI_MATIN_SOUS = 13;
    static final double SHORT_SI_JOURNEE_DES = 22;
    static final double SHORT_SI_MATIN_DES = 15;
    static final double ECHARPE_SI_MATIN_MAX = 7;
    static final double BONNET_SI_MATIN_MAX = 5;
    static final double GANTS_SI_MATIN_MAX = 3;
    static final int PLUIE_SI_RISQUE_DES = 50;
    static final double BOTTES_SI_PRECIPITATIONS_DES = 5;
    static final double PROTECTION_SOLAIRE_SI_UV_DES = 5;
    static final double SUPERPOSER_SI_ECART_DES = 8;

    private final int heureDepart;

    @Autowired
    public TenueAdvisor(MeteoProperties properties) {
        this(properties.heureDepart());
    }

    public TenueAdvisor(int heureDepart) {
        this.heureDepart = heureDepart;
    }

    /** Conditions utiles au conseil. Toute valeur numérique peut manquer. */
    public record Conditions(Ciel ciel, Double ressentiMatin, Double ressentiJournee, Integer risquePluie,
                             Double precipitations, Double uvIndex) {
    }

    public record Conseil(List<Vetement> tenue, boolean superposer) {
    }

    /**
     * Prévision et tenue d'une journée.
     *
     * @throws IllegalStateException si la prévision ne contient pas ce jour
     */
    public MeteoJourDTO analyser(LocalDate date, Forecast forecast) {
        Daily daily = forecast == null ? null : forecast.daily();
        int i = daily == null || daily.time() == null ? -1 : daily.time().indexOf(date);
        if (i < 0) {
            throw new IllegalStateException("Prévision absente pour le " + date);
        }
        Hourly hourly = forecast.hourly();
        Double temperatureMin = at(daily.temperatureMin(), i);
        Double temperatureMax = at(daily.temperatureMax(), i);

        Double ressentiMatin = horaire(hourly, Hourly::apparentTemperature, date, heureDepart, heureDepart)
                .orElse(temperatureMin);
        Double ressentiJournee = horaire(hourly, Hourly::apparentTemperature, date, HEURE_DEBUT_JOURNEE, HEURE_FIN_JOURNEE)
                .orElse(temperatureMax);
        Integer risquePluie = horaire(hourly, Hourly::precipitationProbability, date, heureDepart, HEURE_FIN_JOURNEE)
                .orElse(at(daily.precipitationProbabilityMax(), i));
        Ciel ciel = Ciel.fromWmo(at(daily.weatherCode(), i));

        Conseil conseil = conseiller(new Conditions(ciel, ressentiMatin, ressentiJournee, risquePluie,
                at(daily.precipitationSum(), i), at(daily.uvIndexMax(), i)));
        return new MeteoJourDTO(date, ciel, temperatureMin, temperatureMax, ressentiMatin, ressentiJournee,
                risquePluie, conseil.tenue(), conseil.superposer());
    }

    public Conseil conseiller(Conditions c) {
        // Un ressenti manquant est remplacé par l'autre ; sans aucun, pas de règle de température.
        Double m = c.ressentiMatin() != null ? c.ressentiMatin() : c.ressentiJournee();
        Double j = c.ressentiJournee() != null ? c.ressentiJournee() : m;
        boolean pluie = (c.risquePluie() != null && c.risquePluie() >= PLUIE_SI_RISQUE_DES)
                || (c.ciel() != null && c.ciel().isMouille());

        Set<Vetement> tenue = EnumSet.of(Vetement.T_SHIRT);
        if (m != null && (m < PULL_SI_MATIN_SOUS || j < PULL_SI_JOURNEE_SOUS)) {
            tenue.add(Vetement.PULL);
        }

        if (m != null && m < MANTEAU_SI_MATIN_SOUS) {
            tenue.add(Vetement.MANTEAU);
        } else if (pluie) {
            tenue.add(Vetement.IMPERMEABLE);
        } else if (m != null && m < VESTE_SI_MATIN_SOUS) {
            tenue.add(Vetement.VESTE);
        }

        tenue.add(m != null && j >= SHORT_SI_JOURNEE_DES && m >= SHORT_SI_MATIN_DES ? Vetement.SHORT : Vetement.PANTALON);

        if (m != null && m <= ECHARPE_SI_MATIN_MAX) {
            tenue.add(Vetement.ECHARPE);
        }
        if (m != null && m <= BONNET_SI_MATIN_MAX) {
            tenue.add(Vetement.BONNET);
        }
        if (m != null && m <= GANTS_SI_MATIN_MAX) {
            tenue.add(Vetement.GANTS);
        }

        if ((c.precipitations() != null && c.precipitations() >= BOTTES_SI_PRECIPITATIONS_DES) || c.ciel() == Ciel.NEIGE) {
            tenue.add(Vetement.BOTTES);
        }
        if (c.uvIndex() != null && c.uvIndex() >= PROTECTION_SOLAIRE_SI_UV_DES) {
            tenue.add(Vetement.CASQUETTE);
            tenue.add(Vetement.CREME_SOLAIRE);
        }

        boolean superposer = tenue.contains(Vetement.PULL) && j - m >= SUPERPOSER_SI_ECART_DES;
        return new Conseil(List.copyOf(tenue), superposer);
    }

    /** Maximum des valeurs horaires non nulles du jour, heures {@code de} à {@code a} incluses. */
    private static <T extends Comparable<T>> Optional<T> horaire(Hourly hourly, Function<Hourly, List<T>> serie,
                                                                LocalDate date, int de, int a) {
        if (hourly == null || hourly.time() == null || serie.apply(hourly) == null) {
            return Optional.empty();
        }
        List<T> valeurs = new ArrayList<>();
        for (int i = 0; i < hourly.time().size(); i++) {
            LocalDateTime t = hourly.time().get(i);
            if (t != null && t.toLocalDate().equals(date) && t.getHour() >= de && t.getHour() <= a) {
                valeurs.add(at(serie.apply(hourly), i));
            }
        }
        return valeurs.stream().filter(Objects::nonNull).max(Comparator.naturalOrder());
    }

    private static <T> T at(List<T> list, int i) {
        return list != null && i < list.size() ? list.get(i) : null;
    }
}
