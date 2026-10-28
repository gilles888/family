package com.family.agenda.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Règle d'accès à un membre pour {@code @PreAuthorize} : un parent accède à tous les membres ; un enfant
 * seulement au membre lié à son compte.
 */
@Component("memberAccess")
public class MemberAccess {

    public boolean member(Long memberId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (isParent(auth)) {
            return true;
        }
        return auth != null && auth.getPrincipal() instanceof AccountPrincipal p && p.memberId() != null
                && p.memberId().equals(memberId);
    }

    static boolean isParent(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_PARENT".equals(a.getAuthority()));
    }
}
