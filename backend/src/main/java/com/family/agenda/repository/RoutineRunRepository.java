package com.family.agenda.repository;

import com.family.agenda.entity.RoutineRun;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RoutineRunRepository extends JpaRepository<RoutineRun, Long> {

    @EntityGraph(attributePaths = "checkedSteps")
    Optional<RoutineRun> findByRoutineIdAndDate(Long routineId, LocalDate date);

    @EntityGraph(attributePaths = "checkedSteps")
    List<RoutineRun> findByRoutineIdInAndDate(Collection<Long> routineIds, LocalDate date);

    /** Historique : routines finies d'une plage de jours. */
    List<RoutineRun> findByRoutineIdInAndDateBetweenAndCompletedAtNotNull(Collection<Long> routineIds, LocalDate debut,
                                                                         LocalDate fin);
}
