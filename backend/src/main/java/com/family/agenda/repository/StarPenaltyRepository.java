package com.family.agenda.repository;

import com.family.agenda.entity.StarPenalty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StarPenaltyRepository extends JpaRepository<StarPenalty, Long> {

    List<StarPenalty> findByMemberIdAndDateBetweenOrderByDateAscIdAsc(Long memberId, LocalDate debut, LocalDate fin);

    List<StarPenalty> findByMemberIdOrderByDateDescIdDesc(Long memberId);

    Optional<StarPenalty> findByIdAndMemberId(Long id, Long memberId);

    @Query("select coalesce(sum(p.nombre), 0) from StarPenalty p where p.member.id = :memberId")
    long totalRemoved(@Param("memberId") Long memberId);
}
