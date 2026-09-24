package com.family.agenda.service;

import com.family.agenda.entity.RecurrenceRule;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * Calcul pur (sans base de données) des dates d'occurrence d'une récurrence.
 * <p>
 * Le calcul repart toujours de la date de début : c'est indispensable pour respecter {@code nombreOccurrences}
 * (le n-ième est compté depuis la première occurrence) et pour éviter la dérive des fins de mois
 * (31 janv. -> 28 févr. -> 31 mars, et non 28 mars).
 */
@Component
public class RecurrenceCalculator {

    /** Garde-fou contre une règle qui produirait un nombre absurde d'occurrences. */
    static final int MAX_OCCURRENCES = 5_000;

    /**
     * @param debut      date/heure de la première occurrence
     * @param rule       règle de récurrence
     * @param horizonFin dernière date (incluse) jusqu'où générer, en plus de la fin propre à la règle
     * @return occurrences triées chronologiquement, la première étant toujours {@code debut}
     * (sauf WEEKLY avec jours explicites, où seuls les jours cochés à partir de {@code debut} comptent)
     */
    public List<LocalDateTime> occurrences(LocalDateTime debut, RecurrenceRule rule, LocalDate horizonFin) {
        LocalDate limite = horizonFin;
        if (rule.getDateFin() != null && rule.getDateFin().isBefore(limite)) {
            limite = rule.getDateFin();
        }
        int max = rule.getNombreOccurrences() != null
                ? Math.min(rule.getNombreOccurrences(), MAX_OCCURRENCES)
                : MAX_OCCURRENCES;
        int intervalle = Math.max(1, rule.getIntervalle());

        List<LocalDateTime> result = new ArrayList<>();
        switch (rule.getFrequence()) {
            case WEEKLY -> weekly(debut, rule.getJoursSemaine(), intervalle, limite, max, result);
            case DAILY -> stepped(debut, limite, max, result, i -> debut.plusDays(i * intervalle));
            case MONTHLY -> stepped(debut, limite, max, result, i -> debut.plusMonths(i * intervalle));
            case YEARLY -> stepped(debut, limite, max, result, i -> debut.plusYears(i * intervalle));
        }
        return result;
    }

    private void stepped(LocalDateTime debut, LocalDate limite, int max, List<LocalDateTime> out,
                         java.util.function.LongFunction<LocalDateTime> nth) {
        for (long i = 0; out.size() < max; i++) {
            LocalDateTime dt = nth.apply(i);
            if (dt.toLocalDate().isAfter(limite)) {
                return;
            }
            out.add(dt);
        }
    }

    private void weekly(LocalDateTime debut, Set<DayOfWeek> jours, int intervalle, LocalDate limite, int max,
                        List<LocalDateTime> out) {
        List<DayOfWeek> days = (jours == null || jours.isEmpty())
                ? List.of(debut.getDayOfWeek())
                : jours.stream().sorted(Comparator.naturalOrder()).toList();

        LocalDate startDate = debut.toLocalDate();
        // Les semaines sont comptées à partir du lundi de la semaine de début (norme ISO).
        for (LocalDate semaine = startDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
             !semaine.isAfter(limite);
             semaine = semaine.plusWeeks(intervalle)) {
            for (DayOfWeek day : days) {
                LocalDate date = semaine.plusDays(day.getValue() - 1L);
                if (date.isBefore(startDate)) {
                    continue;
                }
                if (date.isAfter(limite) || out.size() >= max) {
                    return;
                }
                out.add(LocalDateTime.of(date, debut.toLocalTime()));
            }
        }
    }
}
