package com.family.agenda.service;

import com.family.agenda.dto.AccountCreateRequest;
import com.family.agenda.dto.AccountDTO;
import com.family.agenda.dto.AccountRules;
import com.family.agenda.dto.AccountUpdateRequest;
import com.family.agenda.entity.AccountRole;
import com.family.agenda.entity.UserAccount;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ConflictException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Comptes de connexion. Pas d'inscription publique : le premier compte vient de ADMIN_USERNAME / ADMIN_PASSWORD
 * (ou du profil dev), les suivants sont créés par un parent ou par famille.json. Aucun mot de passe n'est journalisé.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AccountService {

    private final UserAccountRepository repository;
    private final FamilyMemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    /** « Léa » → « léa » : l'unicité des identifiants est insensible à la casse. */
    public static String normalize(String identifiant) {
        return identifiant == null ? null : identifiant.strip().toLowerCase(Locale.ROOT);
    }

    @Transactional(readOnly = true)
    public List<AccountDTO> findAll() {
        return repository.findAllByOrderByIdentifiantAsc().stream().map(AccountDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public AccountDTO findById(Long id) {
        return AccountDTO.from(load(id));
    }

    @Transactional(readOnly = true)
    public boolean isEmpty() {
        return repository.count() == 0;
    }

    /** Compte créé par un parent : avec un mot de passe, actif et à changer à la première connexion ; sans, inactif. */
    public AccountDTO create(AccountCreateRequest request) {
        return AccountDTO.from(newAccount(request.identifiant(), request.role(), request.membreId(), request.motDePasse(), true));
    }

    /**
     * @param motDePasse    null = inactif tant qu'un parent n'a pas défini de mot de passe
     * @param doitChanger   le mot de passe devra être changé à la première connexion
     */
    public UserAccount newAccount(String identifiant, AccountRole role, Long memberId, String motDePasse, boolean doitChanger) {
        String normalized = normalize(identifiant);
        if (normalized == null || !normalized.matches(AccountRules.IDENTIFIANT)) {
            throw new BusinessRuleException(
                    "Identifiant invalide : 3 à 50 caractères, lettres, chiffres, point, tiret ou souligné");
        }
        if (repository.existsByIdentifiant(normalized)) {
            throw new ConflictException("L'identifiant « %s » est déjà utilisé".formatted(normalized));
        }
        checkMember(role, memberId);
        UserAccount account = new UserAccount();
        account.setIdentifiant(normalized);
        account.setRole(role);
        account.setMemberId(memberId);
        account.setCreeLe(LocalDateTime.now(clock));
        if (motDePasse != null) {
            checkPassword(motDePasse);
            account.setPasswordHash(passwordEncoder.encode(motDePasse));
            account.setActif(true);
            account.setDoitChangerMotDePasse(doitChanger);
        }
        return repository.save(account);
    }

    /**
     * Rôle, membre lié, activation. Un parent ne peut ni se désactiver ni se retirer le rôle de parent, et il reste
     * toujours au moins un parent actif.
     */
    public AccountDTO update(Long id, AccountUpdateRequest request, Long actingAccountId) {
        UserAccount account = load(id);
        boolean actif = request.actif();
        if (id.equals(actingAccountId) && (!actif || request.role() != AccountRole.PARENT)) {
            throw new BusinessRuleException("Vous ne pouvez pas désactiver votre propre compte ni retirer votre rôle de parent");
        }
        boolean resteParentActif = actif && request.role() == AccountRole.PARENT;
        if (account.isActif() && account.getRole() == AccountRole.PARENT && !resteParentActif
                && repository.countByRoleAndActifTrue(AccountRole.PARENT) <= 1) {
            throw new BusinessRuleException("Il faut garder au moins un compte parent actif");
        }
        if (actif && account.getPasswordHash() == null) {
            throw new BusinessRuleException("Définissez d'abord un mot de passe pour activer ce compte");
        }
        checkMember(request.role(), request.membreId());
        boolean securityChange = account.isActif() != actif || account.getRole() != request.role()
                || !Objects.equals(account.getMemberId(), request.membreId());
        account.setRole(request.role());
        account.setMemberId(request.membreId());
        account.setActif(actif);
        if (securityChange) {
            invalidateSessions(account);
        }
        return AccountDTO.from(account);
    }

    /**
     * Mot de passe défini par un parent : à changer à la prochaine connexion. Un compte sans mot de passe (créé
     * inactif) devient actif ; un compte désactivé le reste. Débloque le compte.
     */
    public AccountDTO resetPassword(Long id, String motDePasse) {
        UserAccount account = load(id);
        checkPassword(motDePasse);
        if (account.getPasswordHash() == null) {
            account.setActif(true);
        }
        account.setPasswordHash(passwordEncoder.encode(motDePasse));
        account.setDoitChangerMotDePasse(true);
        account.setEchecsConnexion(0);
        account.setBloqueJusqua(null);
        invalidateSessions(account);
        log.info("Mot de passe du compte « {} » réinitialisé par un parent", account.getIdentifiant());
        return AccountDTO.from(account);
    }

    /** Changement de son propre mot de passe : l'ancien est exigé, le nouveau doit être différent. */
    public UserAccount changeOwnPassword(Long id, String ancien, String nouveau) {
        UserAccount account = load(id);
        if (ancien == null || account.getPasswordHash() == null || !passwordEncoder.matches(ancien, account.getPasswordHash())) {
            throw new BusinessRuleException("Mot de passe actuel incorrect");
        }
        checkPassword(nouveau);
        if (passwordEncoder.matches(nouveau, account.getPasswordHash())) {
            throw new BusinessRuleException("Le nouveau mot de passe doit être différent de l'actuel");
        }
        account.setPasswordHash(passwordEncoder.encode(nouveau));
        account.setDoitChangerMotDePasse(false);
        invalidateSessions(account);
        return account;
    }

    /**
     * Compte déclaré dans famille.json. S'il existe déjà (compte administrateur créé depuis ADMIN_USERNAME au même
     * démarrage), famille.json donne le rôle et le membre, ADMIN_PASSWORD reste le mot de passe initial.
     */
    public UserAccount seed(String identifiant, AccountRole role, Long memberId, String motDePasseInitial) {
        return repository.findByIdentifiant(normalize(identifiant)).map(existing -> {
            existing.setRole(role);
            existing.setMemberId(memberId);
            existing.setDoitChangerMotDePasse(true);
            invalidateSessions(existing);
            log.info("Compte « {} » : rôle et membre repris de famille.json, mot de passe initial = ADMIN_PASSWORD",
                    existing.getIdentifiant());
            return existing;
        }).orElseGet(() -> newAccount(identifiant, role, memberId, motDePasseInitial, true));
    }

    private void checkMember(AccountRole role, Long memberId) {
        if (memberId != null && !memberRepository.existsById(memberId)) {
            throw new ResourceNotFoundException("Membre", memberId);
        }
        if (role == AccountRole.ENFANT && memberId == null) {
            throw new BusinessRuleException("Un compte enfant doit être lié à un membre de la famille");
        }
    }

    private static void checkPassword(String motDePasse) {
        if (motDePasse == null || motDePasse.length() < AccountRules.MOT_DE_PASSE_MIN
                || motDePasse.length() > AccountRules.MOT_DE_PASSE_MAX) {
            throw new BusinessRuleException("Le mot de passe doit contenir de %d à %d caractères"
                    .formatted(AccountRules.MOT_DE_PASSE_MIN, AccountRules.MOT_DE_PASSE_MAX));
        }
    }

    private void invalidateSessions(UserAccount account) {
        account.incrementerVersionSecurite();
        events.publishEvent(new AccountSecurityChangedEvent(account.getIdentifiant()));
    }

    private UserAccount load(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Compte", id));
    }
}
