package com.family.agenda.service;

import com.family.agenda.config.MeteoProperties;
import com.family.agenda.dto.MeteoDTO;
import com.family.agenda.exception.MeteoIndisponibleException;
import com.family.agenda.service.OpenMeteoClient.Forecast;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MeteoServiceTest {

    private static final ZoneId BRUXELLES = ZoneId.of("Europe/Brussels");
    private static final LocalDate JOUR = LocalDate.parse("2026-09-24");

    static class MutableClock extends Clock {
        volatile Instant instant = JOUR.atTime(7, 0).atZone(BRUXELLES).toInstant();

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return instant; }

        void avancer(Duration d) { instant = instant.plus(d); }
    }

    /** Faux client : compte les appels et renvoie ce que {@link #reponse} fournit (ou lève son exception). */
    static class FakeClient extends OpenMeteoClient {
        int appels;
        Supplier<Forecast> reponse;

        FakeClient(MeteoProperties properties) {
            super(properties);
        }

        @Override
        public Forecast forecast() {
            appels++;
            return reponse.get();
        }
    }

    private final MeteoProperties properties = new MeteoProperties("Bruxelles", 50.85, 4.35, BRUXELLES, 8,
            Duration.ofMinutes(30), "http://localhost:1");
    private final MutableClock clock = new MutableClock();
    private final FakeClient client = new FakeClient(properties);
    private final MeteoService service = new MeteoService(client, new TenueAdvisor(properties), properties, clock);

    private static Forecast prevision(LocalDate jour) {
        Forecast f = TenueAdvisorTest.forecast(new Double[48], new Integer[48]);
        long decalage = jour.toEpochDay() - JOUR.toEpochDay();
        var d = f.daily();
        return new Forecast(new OpenMeteoClient.Daily(d.time().stream().map(t -> t.plusDays(decalage)).toList(),
                d.temperatureMin(), d.temperatureMax(), d.precipitationProbabilityMax(), d.precipitationSum(),
                d.weatherCode(), d.uvIndexMax()), f.hourly());
    }

    private static Supplier<Forecast> panne() {
        return () -> { throw new IllegalStateException("réseau coupé"); };
    }

    @Test
    void construitAujourdhuiEtDemain() {
        client.reponse = () -> prevision(JOUR);

        MeteoDTO meteo = service.getMeteo();

        assertThat(meteo.lieu()).isEqualTo("Bruxelles");
        assertThat(meteo.jours()).extracting(j -> j.date()).containsExactly(JOUR, JOUR.plusDays(1));
        assertThat(meteo.jours().getFirst().temperatureMax()).isEqualTo(19.0);
        assertThat(meteo.jours().get(1).temperatureMax()).isEqualTo(21.0);
    }

    @Test
    void jourCalculeDansLeFuseauConfigure() {
        // 23 septembre 23:30 UTC = 24 septembre 01:30 à Bruxelles
        clock.instant = Instant.parse("2026-09-23T23:30:00Z");
        client.reponse = () -> prevision(JOUR);

        assertThat(service.getMeteo().jours().getFirst().date()).isEqualTo(JOUR);
    }

    @Test
    void utiliseLeCachePendantSaDuree() {
        client.reponse = () -> prevision(JOUR);

        MeteoDTO premier = service.getMeteo();
        clock.avancer(Duration.ofMinutes(29));
        assertThat(service.getMeteo()).isSameAs(premier);
        assertThat(client.appels).isEqualTo(1);

        clock.avancer(Duration.ofMinutes(1));
        service.getMeteo();
        assertThat(client.appels).isEqualTo(2);
    }

    @Test
    void cacheInvalideAuChangementDeJour() {
        clock.instant = JOUR.atTime(23, 50).atZone(BRUXELLES).toInstant();
        client.reponse = () -> prevision(JOUR);
        service.getMeteo();

        clock.avancer(Duration.ofMinutes(15)); // 00:05 le lendemain, cache encore « frais »
        client.reponse = () -> prevision(JOUR.plusDays(1));

        assertThat(service.getMeteo().jours().getFirst().date()).isEqualTo(JOUR.plusDays(1));
        assertThat(client.appels).isEqualTo(2);
    }

    @Test
    void repliSurLaPrevisionDuJourSiOpenMeteoEchoue() {
        client.reponse = () -> prevision(JOUR);
        MeteoDTO premier = service.getMeteo();

        clock.avancer(Duration.ofHours(2));
        client.reponse = panne();

        assertThat(service.getMeteo()).isSameAs(premier);
        assertThat(client.appels).isEqualTo(2);
    }

    @Test
    void indisponibleSansCache() {
        client.reponse = panne();

        assertThatThrownBy(service::getMeteo).isInstanceOf(MeteoIndisponibleException.class);
    }

    @Test
    void reponseSansLeJourCouranteEstUneErreur() {
        client.reponse = () -> prevision(JOUR.minusDays(1));

        assertThatThrownBy(service::getMeteo).isInstanceOf(MeteoIndisponibleException.class);
    }

    @Test
    void pasDeRepliSurLaPrevisionDeLaVeille() {
        client.reponse = () -> prevision(JOUR);
        service.getMeteo();

        clock.avancer(Duration.ofDays(1));
        client.reponse = panne();

        assertThatThrownBy(service::getMeteo).isInstanceOf(MeteoIndisponibleException.class);
    }
}
