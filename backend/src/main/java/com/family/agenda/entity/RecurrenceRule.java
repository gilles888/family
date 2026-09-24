package com.family.agenda.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;

/**
 * Règle de récurrence d'un {@link Reminder}. Une seule fin possible : {@code dateFin} (incluse) OU
 * {@code nombreOccurrences} ; si les deux sont nuls, la récurrence n'a pas de fin (la génération reste
 * bornée par la fenêtre glissante).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class RecurrenceRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RecurrenceFrequency frequence;

    /** Tous les N jours / semaines / mois / ans (>= 1). */
    @Column(nullable = false)
    private int intervalle = 1;

    /** Uniquement pour WEEKLY ; vide = jour de la semaine de la date de début. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "recurrence_rule_jours", joinColumns = @JoinColumn(name = "recurrence_rule_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "jour", length = 10)
    private Set<DayOfWeek> joursSemaine = EnumSet.noneOf(DayOfWeek.class);

    /** Dernière date (incluse) à laquelle une occurrence peut tomber. */
    private LocalDate dateFin;

    /** Nombre total d'occurrences (la première, à la date de début, comprise). */
    private Integer nombreOccurrences;
}
