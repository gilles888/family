package com.family.agenda.service;

import com.family.agenda.dto.Ciel;
import com.family.agenda.dto.MeteoJourDTO;
import com.family.agenda.service.OpenMeteoClient.Daily;
import com.family.agenda.service.OpenMeteoClient.Forecast;
import com.family.agenda.service.OpenMeteoClient.Hourly;
import com.family.agenda.service.TenueAdvisor.Conditions;
import com.family.agenda.service.TenueAdvisor.Conseil;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static com.family.agenda.dto.Vetement.BONNET;
import static com.family.agenda.dto.Vetement.BOTTES;
import static com.family.agenda.dto.Vetement.CASQUETTE;
import static com.family.agenda.dto.Vetement.CREME_SOLAIRE;
import static com.family.agenda.dto.Vetement.ECHARPE;
import static com.family.agenda.dto.Vetement.GANTS;
import static com.family.agenda.dto.Vetement.IMPERMEABLE;
import static com.family.agenda.dto.Vetement.MANTEAU;
import static com.family.agenda.dto.Vetement.PANTALON;
import static com.family.agenda.dto.Vetement.PULL;
import static com.family.agenda.dto.Vetement.SHORT;
import static com.family.agenda.dto.Vetement.T_SHIRT;
import static com.family.agenda.dto.Vetement.VESTE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenueAdvisorTest {

    private static final LocalDate JOUR = LocalDate.parse("2026-09-24");

    private final TenueAdvisor advisor = new TenueAdvisor(8);

    private Conseil conseil(Ciel ciel, double matin, double journee, int risquePluie, double pluieMm, double uv) {
        return advisor.conseiller(new Conditions(ciel, matin, journee, risquePluie, pluieMm, uv));
    }

    @Test
    void chaudEtEnsoleille() {
        Conseil c = conseil(Ciel.SOLEIL, 18, 27, 0, 0, 7);

        assertThat(c.tenue()).containsExactly(T_SHIRT, SHORT, CASQUETTE, CREME_SOLAIRE);
        assertThat(c.superposer()).isFalse();
    }

    @Test
    void matinFraisApresMidiDouxSuperpose() {
        Conseil c = conseil(Ciel.ECLAIRCIES, 10, 19, 10, 0, 3);

        assertThat(c.tenue()).containsExactly(T_SHIRT, PULL, VESTE, PANTALON);
        assertThat(c.superposer()).isTrue();
    }

    @Test
    void pluieDonneImpermeableEtBottes() {
        Conseil c = conseil(Ciel.PLUIE, 12, 14, 90, 8, 1);

        assertThat(c.tenue()).containsExactly(T_SHIRT, PULL, IMPERMEABLE, PANTALON, BOTTES);
        assertThat(c.superposer()).isFalse();
    }

    @Test
    void cielMouilleSuffitPourImpermeableMemeAvecRisqueFaible() {
        assertThat(conseil(Ciel.BRUINE, 16, 20, 20, 0.5, 2).tenue()).containsExactly(T_SHIRT, IMPERMEABLE, PANTALON);
    }

    @Test
    void hiverComplet() {
        Conseil c = conseil(Ciel.NEIGE, -2, 1, 80, 3, 1);

        assertThat(c.tenue()).containsExactly(T_SHIRT, PULL, MANTEAU, PANTALON, BONNET, ECHARPE, GANTS, BOTTES);
    }

    @Test
    void seuils() {
        // pull : matin < 15 ou journée < 18
        assertThat(conseil(Ciel.SOLEIL, 15, 18, 0, 0, 0).tenue()).doesNotContain(PULL);
        assertThat(conseil(Ciel.SOLEIL, 14.9, 18, 0, 0, 0).tenue()).contains(PULL);
        assertThat(conseil(Ciel.SOLEIL, 15, 17.9, 0, 0, 0).tenue()).contains(PULL);
        // manteau < 8, veste < 13
        assertThat(conseil(Ciel.SOLEIL, 7.9, 10, 0, 0, 0).tenue()).contains(MANTEAU).doesNotContain(VESTE);
        assertThat(conseil(Ciel.SOLEIL, 8, 10, 0, 0, 0).tenue()).contains(VESTE).doesNotContain(MANTEAU);
        assertThat(conseil(Ciel.SOLEIL, 13, 18, 0, 0, 0).tenue()).doesNotContain(VESTE, MANTEAU);
        // la pluie remplace la veste, pas le manteau
        assertThat(conseil(Ciel.SOLEIL, 10, 12, 50, 0, 0).tenue()).contains(IMPERMEABLE).doesNotContain(VESTE);
        assertThat(conseil(Ciel.SOLEIL, 10, 12, 49, 0, 0).tenue()).contains(VESTE).doesNotContain(IMPERMEABLE);
        assertThat(conseil(Ciel.PLUIE, 5, 8, 100, 0, 0).tenue()).contains(MANTEAU).doesNotContain(IMPERMEABLE);
        // short : journée ≥ 22 et matin ≥ 15
        assertThat(conseil(Ciel.SOLEIL, 15, 22, 0, 0, 0).tenue()).contains(SHORT).doesNotContain(PANTALON);
        assertThat(conseil(Ciel.SOLEIL, 14.9, 25, 0, 0, 0).tenue()).contains(PANTALON).doesNotContain(SHORT);
        assertThat(conseil(Ciel.SOLEIL, 18, 21.9, 0, 0, 0).tenue()).contains(PANTALON);
        // écharpe ≤ 7, bonnet ≤ 5, gants ≤ 3
        assertThat(conseil(Ciel.SOLEIL, 7, 9, 0, 0, 0).tenue()).contains(ECHARPE).doesNotContain(BONNET);
        assertThat(conseil(Ciel.SOLEIL, 7.1, 9, 0, 0, 0).tenue()).doesNotContain(ECHARPE);
        assertThat(conseil(Ciel.SOLEIL, 5, 9, 0, 0, 0).tenue()).contains(BONNET).doesNotContain(GANTS);
        assertThat(conseil(Ciel.SOLEIL, 3, 9, 0, 0, 0).tenue()).contains(GANTS);
        // bottes ≥ 5 mm, UV ≥ 5
        assertThat(conseil(Ciel.NUAGEUX, 15, 18, 0, 4.9, 4.9).tenue()).doesNotContain(BOTTES, CASQUETTE, CREME_SOLAIRE);
        assertThat(conseil(Ciel.NUAGEUX, 15, 18, 0, 5, 5).tenue()).contains(BOTTES, CASQUETTE, CREME_SOLAIRE);
        // superposer : pull et écart ≥ 8
        assertThat(conseil(Ciel.SOLEIL, 10, 18, 0, 0, 0).superposer()).isTrue();
        assertThat(conseil(Ciel.SOLEIL, 10, 17.9, 0, 0, 0).superposer()).isFalse();
        assertThat(conseil(Ciel.SOLEIL, 15, 25, 0, 0, 0).superposer()).isFalse(); // pas de pull
    }

    @Test
    void sansTemperatureSeulesPluieEtSoleilComptent() {
        Conseil c = advisor.conseiller(new Conditions(Ciel.PLUIE, null, null, null, null, 6.0));

        assertThat(c.tenue()).containsExactly(T_SHIRT, IMPERMEABLE, PANTALON, CASQUETTE, CREME_SOLAIRE);
        assertThat(c.superposer()).isFalse();
    }

    @Test
    void analyserLitLesValeursHorairesDuJour() {
        Double[] ressentis = new Double[48];
        Integer[] pluie = new Integer[48];
        Arrays.fill(ressentis, 5.0);
        Arrays.fill(pluie, 0);
        ressentis[8] = 9.0;   // 8 h : départ
        ressentis[15] = 20.0; // 15 h : max de la journée
        ressentis[20] = 30.0; // 20 h : hors fenêtre
        pluie[7] = 100;       // avant le départ : ignoré
        pluie[18] = 60;       // 18 h : inclus
        pluie[32] = 100;      // demain : ignoré

        MeteoJourDTO jour = advisor.analyser(JOUR, forecast(ressentis, pluie));

        assertThat(jour.ciel()).isEqualTo(Ciel.ECLAIRCIES);
        assertThat(jour.temperatureMin()).isEqualTo(6.0);
        assertThat(jour.temperatureMax()).isEqualTo(19.0);
        assertThat(jour.ressentiMatin()).isEqualTo(9.0);
        assertThat(jour.ressentiJournee()).isEqualTo(20.0);
        assertThat(jour.risquePluie()).isEqualTo(60);
        assertThat(jour.tenue()).containsExactly(T_SHIRT, PULL, IMPERMEABLE, PANTALON);
        assertThat(jour.superposer()).isTrue();
    }

    @Test
    void analyserSeRabatSurLesValeursJournalieres() {
        MeteoJourDTO jour = advisor.analyser(JOUR, forecast(new Double[48], new Integer[48]));

        assertThat(jour.ressentiMatin()).isEqualTo(6.0);
        assertThat(jour.ressentiJournee()).isEqualTo(19.0);
        assertThat(jour.risquePluie()).isEqualTo(40);
    }

    @Test
    void analyserRefuseUnJourAbsent() {
        assertThatThrownBy(() -> advisor.analyser(JOUR.minusDays(1), forecast(new Double[48], new Integer[48])))
                .isInstanceOf(IllegalStateException.class);
    }

    /** Deux jours (JOUR et le lendemain), 48 valeurs horaires. */
    static Forecast forecast(Double[] ressentis, Integer[] pluie) {
        List<LocalDateTime> heures = new ArrayList<>();
        for (int h = 0; h < 48; h++) {
            heures.add(JOUR.atStartOfDay().plusHours(h));
        }
        Daily daily = new Daily(List.of(JOUR, JOUR.plusDays(1)), List.of(6.0, 8.0), List.of(19.0, 21.0),
                List.of(40, 10), List.of(1.0, 0.0), List.of(2, 0), List.of(3.0, 4.0));
        return new Forecast(daily, new Hourly(heures, Arrays.asList(ressentis), Arrays.asList(pluie)));
    }
}
