package com.family.agenda.repository;

import com.family.agenda.entity.Routine;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutineRepository extends JpaRepository<Routine, Long> {

    @EntityGraph(attributePaths = "steps")
    List<Routine> findByMemberIdOrderByPositionAscIdAsc(Long memberId);

    int countByMemberId(Long memberId);
}
