package com.family.agenda.security;

import com.family.agenda.entity.UserAccount;
import com.family.agenda.repository.UserAccountRepository;
import com.family.agenda.service.AccountService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Vérification identifiant / mot de passe, avec blocage après {@code maxEchecs} échecs consécutifs.
 * <ul>
 *   <li>Même réponse et même coût (un hachage Argon2 vérifié) que l'identifiant existe ou non ; les identifiants
 *       inconnus sont aussi « bloqués » (en mémoire), pour qu'un blocage ne trahisse pas l'existence d'un compte.</li>
 *   <li>Une ligne de journal stable par tentative, sans mot de passe (pour fail2ban) :
 *       {@code AUTH_OK user=… ip=…}, {@code AUTH_FAIL user=… ip=…}, {@code AUTH_LOCKED user=… ip=…}.</li>
 * </ul>
 */
@Service
@Slf4j
public class LoginService {

    /** Au-delà, la mémoire des identifiants inconnus est vidée (protection contre un remplissage). */
    private static final int MAX_INCONNUS = 10_000;

    private record Attempts(int echecs, LocalDateTime bloqueJusqua) {
    }

    private final UserAccountRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties properties;
    private final Clock clock;
    /** Empreinte factice : un identifiant inconnu coûte un hachage, comme un connu. */
    private final String dummyHash;
    private final Map<String, Attempts> unknown = new ConcurrentHashMap<>();

    public LoginService(UserAccountRepository repository, PasswordEncoder passwordEncoder, AuthProperties properties,
                        Clock clock) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode("mot-de-passe-factice-" + System.nanoTime());
    }

    /** @throws LoginFailedException identifiants invalides, compte bloqué ou désactivé */
    @Transactional(noRollbackFor = LoginFailedException.class)
    public AccountPrincipal login(String identifiant, String motDePasse, String ip) {
        String user = AccountService.normalize(identifiant);
        String password = motDePasse == null ? "" : motDePasse;
        LocalDateTime now = LocalDateTime.now(clock);
        Optional<UserAccount> found = user == null || user.isEmpty() ? Optional.empty() : repository.findByIdentifiant(user);
        if (found.isEmpty()) {
            passwordEncoder.matches(password, dummyHash);
            throw failUnknown(user, ip, now);
        }
        UserAccount account = found.get();
        if (account.isBloque(now)) {
            passwordEncoder.matches(password, dummyHash);
            log.warn("AUTH_LOCKED user={} ip={}", safe(user), safe(ip));
            throw new LoginFailedException(LoginFailedException.Code.COMPTE_BLOQUE, account.getBloqueJusqua());
        }
        String hash = account.getPasswordHash();
        boolean matches = passwordEncoder.matches(password, hash == null ? dummyHash : hash) && hash != null;
        if (!matches) {
            int echecs = account.getEchecsConnexion() + 1;
            if (echecs >= properties.maxEchecs()) {
                account.setEchecsConnexion(0);
                account.setBloqueJusqua(now.plus(properties.dureeBlocage()));
                log.warn("AUTH_LOCKED user={} ip={}", safe(user), safe(ip));
                throw new LoginFailedException(LoginFailedException.Code.COMPTE_BLOQUE, account.getBloqueJusqua());
            }
            account.setEchecsConnexion(echecs);
            log.warn("AUTH_FAIL user={} ip={}", safe(user), safe(ip));
            throw new LoginFailedException(LoginFailedException.Code.IDENTIFIANTS_INVALIDES, null);
        }
        if (!account.isActif()) {
            log.warn("AUTH_FAIL user={} ip={}", safe(user), safe(ip));
            throw new LoginFailedException(LoginFailedException.Code.COMPTE_DESACTIVE, null);
        }
        account.setEchecsConnexion(0);
        account.setBloqueJusqua(null);
        account.setDerniereConnexion(now);
        log.info("AUTH_OK user={} ip={}", safe(user), safe(ip));
        return AccountPrincipal.of(account, now);
    }

    /** Identifiant inconnu : mêmes règles de blocage qu'un compte, en mémoire. */
    private LoginFailedException failUnknown(String user, String ip, LocalDateTime now) {
        String key = user == null ? "" : user;
        Attempts previous = unknown.get(key);
        if (previous != null && previous.bloqueJusqua() != null && now.isBefore(previous.bloqueJusqua())) {
            log.warn("AUTH_LOCKED user={} ip={}", safe(user), safe(ip));
            return new LoginFailedException(LoginFailedException.Code.COMPTE_BLOQUE, previous.bloqueJusqua());
        }
        int echecs = (previous == null || previous.bloqueJusqua() != null ? 0 : previous.echecs()) + 1;
        if (unknown.size() >= MAX_INCONNUS) {
            unknown.clear();
        }
        if (echecs >= properties.maxEchecs()) {
            LocalDateTime until = now.plus(properties.dureeBlocage());
            unknown.put(key, new Attempts(0, until));
            log.warn("AUTH_LOCKED user={} ip={}", safe(user), safe(ip));
            return new LoginFailedException(LoginFailedException.Code.COMPTE_BLOQUE, until);
        }
        unknown.put(key, new Attempts(echecs, null));
        log.warn("AUTH_FAIL user={} ip={}", safe(user), safe(ip));
        return new LoginFailedException(LoginFailedException.Code.IDENTIFIANTS_INVALIDES, null);
    }

    /** Une valeur par ligne de journal, sans espace ni caractère de contrôle (injection dans les journaux). */
    static String safe(String value) {
        if (value == null || value.isEmpty()) {
            return "-";
        }
        String cleaned = value.replaceAll("[^A-Za-z0-9._:@\\-]", "?");
        return cleaned.length() > 64 ? cleaned.substring(0, 64) : cleaned;
    }
}
