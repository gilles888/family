package com.family.agenda.service;

import com.family.agenda.entity.RecurrenceFrequency;
import com.family.agenda.entity.RecurrenceRule;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RecurrenceCalculatorTest {

    private final RecurrenceCalculator calculator = new RecurrenceCalculator();

    private static RecurrenceRule rule(RecurrenceFrequency f, int interval, DayOfWeek... days) {
        RecurrenceRule r = new RecurrenceRule();
        r.setFrequence(f);
        r.setIntervalle(interval);
        if (days.length > 0) {
            r.setJoursSemaine(EnumSet.of(days[0], days));
        }
        return r;
    }

    private static LocalDateTime dt(String iso) {
        return LocalDateTime.parse(iso);
    }

    @Test
    void weeklyWithoutDaysUsesStartDayOfWeek() {
        // 2026-09-23 = mercredi
        List<LocalDateTime> result = calculator.occurrences(dt("2026-09-23T17:30:00"),
                rule(RecurrenceFrequency.WEEKLY, 1), LocalDate.parse("2026-10-14"));

        assertThat(result).containsExactly(dt("2026-09-23T17:30:00"), dt("2026-09-30T17:30:00"),
                dt("2026-10-07T17:30:00"), dt("2026-10-14T17:30:00"));
    }

    @Test
    void weeklyMultipleDaysSkipsDaysBeforeStart() {
        // début jeudi 24/09 : le mardi 22/09 de la même semaine ne doit pas être généré
        List<LocalDateTime> result = calculator.occurrences(dt("2026-09-24T18:00:00"),
                rule(RecurrenceFrequency.WEEKLY, 1, DayOfWeek.TUESDAY, DayOfWeek.THURSDAY), LocalDate.parse("2026-10-06"));

        assertThat(result).containsExactly(dt("2026-09-24T18:00:00"), dt("2026-09-29T18:00:00"),
                dt("2026-10-01T18:00:00"), dt("2026-10-06T18:00:00"));
    }

    @Test
    void weeklyIntervalTwoSkipsAlternateWeeks() {
        List<LocalDateTime> result = calculator.occurrences(dt("2026-09-21T08:00:00"),
                rule(RecurrenceFrequency.WEEKLY, 2, DayOfWeek.MONDAY, DayOfWeek.FRIDAY), LocalDate.parse("2026-10-20"));

        assertThat(result).extracting(LocalDateTime::toLocalDate).containsExactly(
                LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-25"),
                LocalDate.parse("2026-10-05"), LocalDate.parse("2026-10-09"),
                LocalDate.parse("2026-10-19"));
    }

    @Test
    void occurrenceCountIncludesTheFirstOne() {
        RecurrenceRule r = rule(RecurrenceFrequency.DAILY, 1);
        r.setNombreOccurrences(3);

        assertThat(calculator.occurrences(dt("2026-09-21T08:00:00"), r, LocalDate.parse("2030-01-01")))
                .containsExactly(dt("2026-09-21T08:00:00"), dt("2026-09-22T08:00:00"), dt("2026-09-23T08:00:00"));
    }

    @Test
    void occurrenceCountIsCountedFromTheStartEvenWhenHorizonIsShort() {
        RecurrenceRule r = rule(RecurrenceFrequency.WEEKLY, 1, DayOfWeek.TUESDAY, DayOfWeek.THURSDAY);
        r.setNombreOccurrences(5);

        // 5 occurrences au total : mar, jeu, mar, jeu, mar
        assertThat(calculator.occurrences(dt("2026-09-22T18:00:00"), r, LocalDate.parse("2027-01-01"))).hasSize(5);
        // horizon plus court que le nombre : l'horizon gagne
        assertThat(calculator.occurrences(dt("2026-09-22T18:00:00"), r, LocalDate.parse("2026-09-24"))).hasSize(2);
    }

    @Test
    void endDateIsInclusive() {
        RecurrenceRule r = rule(RecurrenceFrequency.DAILY, 1);
        r.setDateFin(LocalDate.parse("2026-09-23"));

        assertThat(calculator.occurrences(dt("2026-09-21T23:30:00"), r, LocalDate.parse("2030-01-01")))
                .hasSize(3).last().isEqualTo(dt("2026-09-23T23:30:00"));
    }

    @Test
    void monthlyOnThe31stDoesNotDrift() {
        List<LocalDateTime> result = calculator.occurrences(dt("2026-01-31T09:00:00"),
                rule(RecurrenceFrequency.MONTHLY, 1), LocalDate.parse("2026-04-30"));

        assertThat(result).extracting(LocalDateTime::toLocalDate).containsExactly(
                LocalDate.parse("2026-01-31"), LocalDate.parse("2026-02-28"),
                LocalDate.parse("2026-03-31"), LocalDate.parse("2026-04-30"));
    }

    @Test
    void yearlyOnLeapDayFallsBackToFeb28() {
        List<LocalDateTime> result = calculator.occurrences(dt("2028-02-29T10:00:00"),
                rule(RecurrenceFrequency.YEARLY, 1), LocalDate.parse("2030-12-31"));

        assertThat(result).extracting(LocalDateTime::toLocalDate).containsExactly(
                LocalDate.parse("2028-02-29"), LocalDate.parse("2029-02-28"),
                LocalDate.parse("2030-02-28"));
    }

    @Test
    void neverExceedsSafetyCapForUnboundedRules() {
        assertThat(calculator.occurrences(dt("2000-01-01T08:00:00"),
                rule(RecurrenceFrequency.DAILY, 1), LocalDate.parse("2100-01-01")))
                .hasSize(RecurrenceCalculator.MAX_OCCURRENCES);
    }
}
