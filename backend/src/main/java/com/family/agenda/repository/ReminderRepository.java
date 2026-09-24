package com.family.agenda.repository;

import com.family.agenda.entity.Reminder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    @EntityGraph(attributePaths = {"membres", "recurrenceRule"})
    List<Reminder> findByActifTrueOrderByDateHeureDebutAscIdAsc();

    @EntityGraph(attributePaths = {"membres", "recurrenceRule"})
    Optional<Reminder> findByIdAndActifTrue(Long id);

    /** Reminders récurrents actifs dont la récurrence n'est pas terminée : candidats à la prolongation nocturne. */
    @Query("""
            select r.id from Reminder r join r.recurrenceRule rr
            where r.actif = true and r.recurring = true
              and (rr.dateFin is null or rr.dateFin >= :today)
            """)
    List<Long> findIdsOfActiveRecurring(@Param("today") LocalDate today);

    @Query("select r from Reminder r join r.membres m where m.id = :memberId")
    List<Reminder> findByMemberId(@Param("memberId") Long memberId);
}
