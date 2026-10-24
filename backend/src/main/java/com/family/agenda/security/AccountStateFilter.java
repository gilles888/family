package com.family.agenda.security;

import com.family.agenda.entity.UserAccount;
import com.family.agenda.repository.UserAccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.Set;

/**
 * À chaque requête d'un utilisateur connecté, relit son compte :
 * <ul>
 *   <li>compte supprimé, désactivé, ou version de sécurité changée depuis la connexion (mot de passe changé ou
 *       réinitialisé, rôle ou membre changé) : session fermée, la requête continue en anonyme (→ 401) ;</li>
 *   <li>mot de passe à changer : seuls /v1/auth/me, /v1/auth/password et /v1/auth/logout passent, sinon 403
 *       {@code MOT_DE_PASSE_A_CHANGER}.</li>
 * </ul>
 */
public class AccountStateFilter extends OncePerRequestFilter {

    static final Set<String> AUTORISES_MOT_DE_PASSE_A_CHANGER = Set.of("/v1/auth/me", "/v1/auth/password", "/v1/auth/logout");

    private final UserAccountRepository repository;
    private final ProblemResponses problems;

    public AccountStateFilter(UserAccountRepository repository, ProblemResponses problems) {
        this.repository = repository;
        this.problems = problems;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AccountPrincipal principal) {
            Optional<UserAccount> account = repository.findById(principal.id());
            if (account.isEmpty() || !account.get().isActif()
                    || account.get().getVersionSecurite() != principal.versionSecurite()) {
                SecurityContextHolder.clearContext();
                HttpSession session = request.getSession(false);
                if (session != null) {
                    session.invalidate();
                }
            } else if (account.get().isDoitChangerMotDePasse() && request.getRequestURI().startsWith("/v1/")
                    && !AUTORISES_MOT_DE_PASSE_A_CHANGER.contains(request.getRequestURI())) {
                problems.write(request, response, HttpStatus.FORBIDDEN, "MOT_DE_PASSE_A_CHANGER",
                        "Changez votre mot de passe avant de continuer");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
