package com.family.agenda.service;

import com.family.agenda.dto.AccountCreateRequest;
import com.family.agenda.dto.AccountDTO;
import com.family.agenda.dto.AccountUpdateRequest;
import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.entity.AccountRole;
import com.family.agenda.entity.UserAccount;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ConflictException;
import com.family.agenda.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Comptes : création, règles de modification, mots de passe (H2, chaque test annulé en fin d'exécution). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@Transactional
class AccountServiceTest {

    @Autowired AccountService service;
    @Autowired UserAccountRepository repository;
    @Autowired FamilyMemberService memberService;
    @Autowired PasswordEncoder passwordEncoder;

    private Long admin;
    private Long lea;

    @BeforeEach
    void setUp() {
        // compte « admin » du profil dev, créé au démarrage
        admin = repository.findByIdentifiant("admin").orElseThrow().getId();
        lea = memberService.create(new FamilyMemberRequest("Léa", "#FF9800")).id();
    }

    @Test
    void compteAdministrateurDuProfilDev() {
        UserAccount account = repository.findById(admin).orElseThrow();

        assertThat(account.getRole()).isEqualTo(AccountRole.PARENT);
        assertThat(account.isActif()).isTrue();
        assertThat(passwordEncoder.matches("admin-dev-1234", account.getPasswordHash())).isTrue();
    }

    @Test
    void creationAvecMotDePasseActifEtAChanger() {
        AccountDTO created = service.create(new AccountCreateRequest(" Lea.B ", AccountRole.ENFANT, lea, "mot-de-passe-1"));

        assertThat(created.identifiant()).isEqualTo("lea.b");
        assertThat(created.actif()).isTrue();
        assertThat(created.motDePasseDefini()).isTrue();
        assertThat(created.doitChangerMotDePasse()).isTrue();
        assertThat(repository.findById(created.id()).orElseThrow().getPasswordHash()).startsWith("{argon2}");
    }

    @Test
    void creationSansMotDePasseInactif() {
        AccountDTO created = service.create(new AccountCreateRequest("lea", AccountRole.ENFANT, lea, null));

        assertThat(created.actif()).isFalse();
        assertThat(created.motDePasseDefini()).isFalse();
    }

    @Test
    void identifiantUniqueInsensibleALaCasse() {
        service.create(new AccountCreateRequest("lea", AccountRole.ENFANT, lea, null));

        assertThatThrownBy(() -> service.create(new AccountCreateRequest("LEA", AccountRole.PARENT, null, null)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void reglesDeCreation() {
        assertThatThrownBy(() -> service.create(new AccountCreateRequest("a b", AccountRole.PARENT, null, null)))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("Identifiant invalide");
        assertThatThrownBy(() -> service.create(new AccountCreateRequest("tom", AccountRole.ENFANT, null, null)))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("lié à un membre");
        assertThatThrownBy(() -> service.create(new AccountCreateRequest("tom", AccountRole.PARENT, null, "court")))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("10 à 128 caractères");
    }

    @Test
    void reinitialisationActiveUnCompteSansMotDePasseEtDemandeUnChangement() {
        Long id = service.create(new AccountCreateRequest("lea", AccountRole.ENFANT, lea, null)).id();

        AccountDTO reset = service.resetPassword(id, "nouveau-mdp-1");

        assertThat(reset.actif()).isTrue();
        assertThat(reset.doitChangerMotDePasse()).isTrue();
        assertThat(repository.findById(id).orElseThrow().getVersionSecurite()).isEqualTo(1);
    }

    @Test
    void reinitialisationNeReactivePasUnCompteDesactive() {
        Long id = service.create(new AccountCreateRequest("lea", AccountRole.ENFANT, lea, "mot-de-passe-1")).id();
        service.update(id, new AccountUpdateRequest(AccountRole.ENFANT, lea, false), admin);

        assertThat(service.resetPassword(id, "nouveau-mdp-1").actif()).isFalse();
    }

    @Test
    void changementDeSonMotDePasse() {
        Long id = service.create(new AccountCreateRequest("lea", AccountRole.ENFANT, lea, "mot-de-passe-1")).id();

        assertThatThrownBy(() -> service.changeOwnPassword(id, "mauvais-mdp-1", "nouveau-mdp-1"))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("actuel incorrect");
        assertThatThrownBy(() -> service.changeOwnPassword(id, "mot-de-passe-1", "mot-de-passe-1"))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("différent");

        UserAccount changed = service.changeOwnPassword(id, "mot-de-passe-1", "nouveau-mdp-1");
        assertThat(changed.isDoitChangerMotDePasse()).isFalse();
        assertThat(passwordEncoder.matches("nouveau-mdp-1", changed.getPasswordHash())).isTrue();
    }

    @Test
    void unParentNePeutNiSeDesactiverNiSeRetirerLeRole() {
        assertThatThrownBy(() -> service.update(admin, new AccountUpdateRequest(AccountRole.PARENT, null, false), admin))
                .isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.update(admin, new AccountUpdateRequest(AccountRole.ENFANT, lea, true), admin))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void auMoinsUnParentActif() {
        Long other = service.create(new AccountCreateRequest("papa", AccountRole.PARENT, null, "mot-de-passe-1")).id();
        service.update(admin, new AccountUpdateRequest(AccountRole.PARENT, null, false), other);

        assertThatThrownBy(() -> service.update(other, new AccountUpdateRequest(AccountRole.PARENT, null, false), null))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("au moins un compte parent actif");
    }

    @Test
    void activationImpossibleSansMotDePasse() {
        Long id = service.create(new AccountCreateRequest("lea", AccountRole.ENFANT, lea, null)).id();

        assertThatThrownBy(() -> service.update(id, new AccountUpdateRequest(AccountRole.ENFANT, lea, true), admin))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("Définissez d'abord un mot de passe");
    }
}
