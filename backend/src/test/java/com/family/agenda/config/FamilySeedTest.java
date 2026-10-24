package com.family.agenda.config;

import com.family.agenda.dto.AgendaEntryDTO;
import com.family.agenda.dto.FamilyMemberDTO;
import com.family.agenda.dto.RoutineDTO;
import com.family.agenda.entity.AccountRole;
import com.family.agenda.entity.UserAccount;
import com.family.agenda.repository.UserAccountRepository;
import com.family.agenda.service.AgendaQueryService;
import com.family.agenda.service.FamilyMemberService;
import com.family.agenda.service.RecipeService;
import com.family.agenda.service.ReminderService;
import com.family.agenda.service.RoutineService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Données de départ depuis un fichier famille (src/test/resources/famille-test.json, famille fictive).
 * Base H2 dédiée : le seed n'est pas annulé et ne doit pas se mélanger aux autres tests.
 */
@SpringBootTest(properties = {
        "agenda.seed.enabled=true",
        "agenda.seed.fichier=src/test/resources/famille-test.json",
        "spring.datasource.url=jdbc:h2:mem:seed-fichier;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE"})
class FamilySeedTest {

    @Autowired FamilyMemberService memberService;
    @Autowired ReminderService reminderService;
    @Autowired AgendaQueryService agendaQueryService;
    @Autowired RoutineService routineService;
    @Autowired RecipeService recipeService;
    @Autowired UserAccountRepository accountRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired Clock clock;

    private Map<String, FamilyMemberDTO> members() {
        return memberService.findAll().stream().collect(Collectors.toMap(FamilyMemberDTO::nom, m -> m));
    }

    @Test
    void membresDuFichierAvecLeursPersonnages() {
        Map<String, FamilyMemberDTO> members = members();

        assertThat(members).containsOnlyKeys("Alice", "Bruno", "Chloé", "Dylan");
        assertThat(members.get("Bruno").couleur()).isEqualTo("#2196F3");
        assertThat(members.get("Bruno").avatarConfig()).containsEntry("eyeColor", "#1e88e5").containsEntry("hair", "hair-short");
        assertThat(members.get("Chloé").avatarConfig()).containsEntry("background", "bg-sunset").hasSize(11);
        assertThat(members.get("Dylan").avatarConfig()).isNull();
    }

    @Test
    void activitesHebdomadairesSurCinqJoursPourLaFille() {
        Long chloe = members().get("Chloé").id();
        LocalDate today = LocalDate.now(clock);

        // une semaine complète à partir d'aujourd'hui : dimanche, samedi, mercredi, mardi, jeudi
        List<AgendaEntryDTO> semaine = agendaQueryService.findBetween(today, today.plusDays(6), chloe);
        assertThat(semaine).extracting(e -> e.dateHeure().getDayOfWeek()).doesNotHaveDuplicates().hasSize(5);
        assertThat(semaine).extracting(AgendaEntryDTO::titre)
                .containsExactlyInAnyOrder("Natation", "Cours de musique", "Atelier dessin", "Judo", "Judo");
        assertThat(reminderService.findAll()).hasSize(4)
                .allSatisfy(r -> assertThat(r.recurrence().frequence().name()).isEqualTo("WEEKLY"));
        // l'activité partagée apparaît aussi chez la maman
        assertThat(agendaQueryService.findBetween(today, today.plusDays(6), members().get("Alice").id()))
                .extracting(AgendaEntryDTO::titre).containsExactly("Atelier dessin");
    }

    @Test
    void routinesCopieesDesModelesDansLaLangueDemandee() {
        LocalDate today = LocalDate.now(clock);

        assertThat(routineService.findForMember(members().get("Chloé").id(), today)).extracting(RoutineDTO::nom)
                .containsExactly("Mijn ochtendroutine", "Mijn avondroutine", "Mijn huiswerk");
        assertThat(routineService.findForMember(members().get("Dylan").id(), today)).extracting(RoutineDTO::nom)
                .containsExactly("Ma routine du matin");
        assertThat(routineService.findForMember(members().get("Alice").id(), today)).isEmpty();
    }

    @Test
    void modeleAvecSesPropresJoursEtHoraires() {
        RoutineDTO devoirs = routineService.findForMember(members().get("Chloé").id(), LocalDate.now(clock)).getLast();

        assertThat(devoirs.jours()).containsExactlyInAnyOrder(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
        assertThat(devoirs.heureDebut()).isEqualTo(LocalTime.of(14, 30));
        assertThat(devoirs.heureFin()).isEqualTo(LocalTime.of(15, 30));
        assertThat(devoirs.etapes()).hasSize(8);
    }

    @Test
    void recettesDeDemonstrationAussiCreees() {
        assertThat(recipeService.findAll(null)).hasSize(3);
    }

    @Test
    void comptesDuFichierAvecMotDePasseInitialHacheEtAChanger() {
        Map<String, Long> ids = members().values().stream().collect(Collectors.toMap(FamilyMemberDTO::nom, FamilyMemberDTO::id));
        UserAccount alice = accountRepository.findByIdentifiant("alice").orElseThrow();

        assertThat(alice.getRole()).isEqualTo(AccountRole.PARENT);
        assertThat(alice.getMemberId()).isEqualTo(ids.get("Alice"));
        assertThat(alice.isActif()).isTrue();
        assertThat(alice.isDoitChangerMotDePasse()).isTrue();
        assertThat(alice.getPasswordHash()).startsWith("{argon2}").doesNotContain("a-changer-1234");
        assertThat(passwordEncoder.matches("a-changer-1234", alice.getPasswordHash())).isTrue();

        UserAccount chloe = accountRepository.findByIdentifiant("chloe").orElseThrow();
        assertThat(chloe.getRole()).isEqualTo(AccountRole.ENFANT);
        assertThat(chloe.getMemberId()).isEqualTo(ids.get("Chloé"));
    }

    @Test
    void compteSansMotDePasseInactif() {
        UserAccount dylan = accountRepository.findByIdentifiant("dylan").orElseThrow();

        assertThat(dylan.isActif()).isFalse();
        assertThat(dylan.getPasswordHash()).isNull();
    }

    @Test
    void compteAdministrateurCompleteParLeFichierSansDoublon() {
        UserAccount admin = accountRepository.findByIdentifiant("admin").orElseThrow();

        assertThat(accountRepository.count()).isEqualTo(4);
        assertThat(admin.getMemberId()).isEqualTo(members().get("Bruno").id());
        assertThat(admin.getRole()).isEqualTo(AccountRole.PARENT);
        // mot de passe de l'administrateur (profil dev) gardé comme mot de passe initial
        assertThat(passwordEncoder.matches("admin-dev-1234", admin.getPasswordHash())).isTrue();
        assertThat(admin.isDoitChangerMotDePasse()).isTrue();
    }
}
