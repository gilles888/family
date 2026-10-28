package com.family.agenda.repository;

import com.family.agenda.entity.StarPenalty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StarPenaltyRepository extends JpaRepository<StarPenalty, Long> {

    List<StarPenalty> findByMemberIdAndDateBetweenOrderByDateAscIdAsc(Long memberId, LocalDate debut, LocalDate fin);

    List<StarPenalty> findByMemberIdOrderByDateDescIdDesc(Long memberId);

    Optional<StarPenalty> findByIdAndMemberId(Long id, Long memberId);
}
