package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/** Suivi d'une routine pour un jour : étapes cochées, fin, récompense jouée. Une seule par routine et par jour. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "routine_run", uniqueConstraints = @UniqueConstraint(name = "uk_routine_run_jour",
        columnNames = {"routine_id", "date_run"}))
public class RoutineRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "routine_id", nullable = false)
    private Routine routine;

    @Column(name = "date_run", nullable = false)
    private LocalDate date;

    @ManyToMany
    @JoinTable(name = "routine_run_step", joinColumns = @JoinColumn(name = "routine_run_id"),
            inverseJoinColumns = @JoinColumn(name = "step_id"))
    private Set<RoutineStep> checkedSteps = new HashSet<>();

    /** Moment où la dernière étape a été cochée ; null tant que la routine n'est pas finie. */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /** La récompense (mini-jeu) du jour a été jouée : une seule partie. */
    @Column(name = "reward_played", nullable = false)
    private boolean rewardPlayed;

    public RoutineRun(Routine routine, LocalDate date) {
        this.routine = routine;
        this.date = date;
    }
}
