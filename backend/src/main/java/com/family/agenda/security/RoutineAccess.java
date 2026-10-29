package com.family.agenda.security;

import com.family.agenda.repository.RoutineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Règles des routines pour {@code @PreAuthorize} : un parent voit et coche tout ; un enfant seulement les routines
 * du membre lié à son compte.
 */
@Component("routineAccess")
@RequiredArgsConstructor
public class RoutineAccess {

    private final RoutineRepository routineRepository;
    private final MemberAccess memberAccess;

    /** Routines du membre {@code memberId}. */
    public boolean member(Long memberId) {
        return memberAccess.member(memberId);
    }

    /** Routine {@code routineId} (inconnue = refusée pour un enfant). */
    @Transactional(readOnly = true)
    public boolean routine(Long routineId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (MemberAccess.isParent(auth)) {
            return true;
        }
        return routineRepository.findById(routineId).map(r -> member(r.getMember().getId())).orElse(false);
    }
}
