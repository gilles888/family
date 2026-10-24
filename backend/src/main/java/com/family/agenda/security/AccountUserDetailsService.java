package com.family.agenda.security;

import com.family.agenda.repository.UserAccountRepository;
import com.family.agenda.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

/** Chargement d'un compte pour « rester connecté » (la connexion par mot de passe passe par LoginService). */
@Service
@RequiredArgsConstructor
public class AccountUserDetailsService implements UserDetailsService {

    private final UserAccountRepository repository;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public AccountPrincipal loadUserByUsername(String username) {
        return repository.findByIdentifiant(AccountService.normalize(username))
                .map(a -> {
                    // « rester connecté » ne vérifie pas le mot de passe : l'empreinte ne part pas en session
                    AccountPrincipal principal = AccountPrincipal.of(a, LocalDateTime.now(clock));
                    principal.eraseCredentials();
                    return principal;
                })
                .orElseThrow(() -> new UsernameNotFoundException("Compte inconnu"));
    }
}
