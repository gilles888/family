package com.family.agenda.service;

import com.family.agenda.service.OpenMeteoClient.Daily;
import com.family.agenda.service.OpenMeteoClient.Forecast;

import java.time.LocalDate;
import java.util.stream.IntStream;

/** Prévisions factices pour les tests : sans données horaires (les valeurs journalières servent de repli). */
public final class MeteoFixtures {

    private MeteoFixtures() {
    }

    /** {@code nbJours} jours à partir de {@code debut} ; le jour i a une température max de 10 + i °C. */
    public static Forecast prevision(LocalDate debut, int nbJours) {
        var jours = IntStream.range(0, nbJours).boxed().toList();
        Daily daily = new Daily(
                jours.stream().map(debut::plusDays).toList(),
                jours.stream().map(i -> 5.0 + i).toList(),
                jours.stream().map(i -> 10.0 + i).toList(),
                jours.stream().map(i -> 20).toList(),
                jours.stream().map(i -> 0.0).toList(),
                jours.stream().map(i -> 1).toList(),
                jours.stream().map(i -> 3.0).toList());
        return new Forecast(daily, null);
    }
}
