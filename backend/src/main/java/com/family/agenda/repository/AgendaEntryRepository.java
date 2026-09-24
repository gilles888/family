package com.family.agenda.repository;

import com.family.agenda.entity.AgendaEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AgendaEntryRepository extends JpaRepository<AgendaEntry, Long> {

    // ---------- gestion / génération

    List<AgendaEntry> findByReminderIdAndDateHeureGreaterThanEqual(Long reminderId, LocalDateTime from);

    @Modifying
    @Query("delete from AgendaEntry e where e.reminder.id = :reminderId and e.dateHeure >= :from")
    int deleteFutureByReminderId(@Param("reminderId") Long reminderId, @Param("from") LocalDateTime from);

    @Query("select new com.family.agenda.repository.EntryRange(count(e), min(e.dateHeure), max(e.dateHeure)) "
            + "from AgendaEntry e where e.reminder.id = :reminderId")
    EntryRange summarize(@Param("reminderId") Long reminderId);

    @Query("select e from AgendaEntry e join fetch e.reminder r left join fetch r.membres where e.id = :id")
    Optional<AgendaEntry> findDetailedById(@Param("id") Long id);

    // ---------- lecture de l'agenda (plage [debut, fin[ )

    @Query("""
            select distinct e from AgendaEntry e join fetch e.reminder r left join fetch r.membres
            where e.dateHeure >= :debut and e.dateHeure < :fin
            order by e.dateHeure, e.id
            """)
    List<AgendaEntry> findInRange(@Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);

    @Query("""
            select distinct e from AgendaEntry e join fetch e.reminder r left join fetch r.membres
            where e.dateHeure >= :debut and e.dateHeure < :fin
              and exists (select 1 from r.membres m where m.id = :membreId)
            order by e.dateHeure, e.id
            """)
    List<AgendaEntry> findInRangeForMember(@Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin,
                                           @Param("membreId") Long membreId);

    // ---------- statistiques (vue annuelle)

    @Query("""
            select new com.family.agenda.repository.MonthTypeCount(month(e.dateHeure), r.type, count(e))
            from AgendaEntry e join e.reminder r
            where e.dateHeure >= :debut and e.dateHeure < :fin
            group by month(e.dateHeure), r.type
            """)
    List<MonthTypeCount> countByMonthAndType(@Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);

    @Query("""
            select new com.family.agenda.repository.MonthTypeCount(month(e.dateHeure), r.type, count(e))
            from AgendaEntry e join e.reminder r
            where e.dateHeure >= :debut and e.dateHeure < :fin
              and exists (select 1 from r.membres m where m.id = :membreId)
            group by month(e.dateHeure), r.type
            """)
    List<MonthTypeCount> countByMonthAndTypeForMember(@Param("debut") LocalDateTime debut,
                                                      @Param("fin") LocalDateTime fin,
                                                      @Param("membreId") Long membreId);
}
