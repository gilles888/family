package com.family.agenda.service;

import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.dto.RoutineDTO;
import com.family.agenda.dto.RoutineRequest;
import com.family.agenda.dto.RoutineRunDTO;
import com.family.agenda.dto.RoutineStepDTO;
import com.family.agenda.dto.RoutineStepRequest;
import com.family.agenda.entity.RoutineTheme;
import com.family.agenda.entity.RoutineType;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ConflictException;
import com.family.agenda.repository.RoutineRunRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Routines : coches, fin calculée par le serveur, un suivi par jour, récompense (H2, chaque test annulé). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@Transactional
class RoutineServiceTest {

    @Autowired RoutineService service;
    @Autowired FamilyMemberService memberService;
    @Autowired RoutineRunRepository runRepository;
    @Autowired EntityManager em;
    @Autowired Clock clock;

    private LocalDate today;
    private Long tom;
    private RoutineDTO routine;

    @BeforeEach
    void setUp() {
        today = LocalDate.now(clock);
        tom = memberService.create(new FamilyMemberRequest("Tom", "#4CAF50")).id();
        routine = service.create(new RoutineRequest(tom, "Mijn ochtendroutine", "Een goede start van de dag!",
                RoutineType.MORNING, RoutineTheme.DAY, EnumSet.allOf(DayOfWeek.class), LocalTime.of(6, 30), LocalTime.of(8, 30),
                true, List.of(step("Ik sta op.", "wake-up"), step("Ik poets mijn tanden.", "toothbrush"),
                step("Ik ben klaar!", "finish"))));
    }

    private static RoutineStepRequest step(String libelle, String icone) {
        return new RoutineStepRequest(null, libelle, icone, null);
    }

    private Long stepId(int index) {
        return routine.etapes().get(index).id();
    }

    @Test
    void creationAvecEtapesOrdonneesEtCouleursPastel() {
        assertThat(routine.etapes()).extracting(RoutineStepDTO::libelle)
                .containsExactly("Ik sta op.", "Ik poets mijn tanden.", "Ik ben klaar!");
        assertThat(routine.etapes()).extracting(RoutineStepDTO::couleur)
                .containsExactly(RoutineTemplates.pastel(0), RoutineTemplates.pastel(1), RoutineTemplates.pastel(2));
        assertThat(routine.etat().etapesCochees()).isEmpty();
        assertThat(routine.etat().terminee()).isFalse();
    }

    @Test
    void cocherPuisDecocherUneEtape() {
        RoutineRunDTO coche = service.toggleStep(routine.id(), today, stepId(1));
        assertThat(coche.etapesCochees()).containsExactly(stepId(1));

        RoutineRunDTO decoche = service.toggleStep(routine.id(), today, stepId(1));
        assertThat(decoche.etapesCochees()).isEmpty();
    }

    @Test
    void termineeQuandToutesLesEtapesSontCochees() {
        service.toggleStep(routine.id(), today, stepId(0));
        RoutineRunDTO deux = service.toggleStep(routine.id(), today, stepId(1));
        assertThat(deux.terminee()).isFalse();
        assertThat(deux.termineeLe()).isNull();

        RoutineRunDTO trois = service.toggleStep(routine.id(), today, stepId(2));
        assertThat(trois.terminee()).isTrue();
        assertThat(trois.termineeLe()).isNotNull();

        // décocher une étape : plus terminée
        assertThat(service.toggleStep(routine.id(), today, stepId(0)).terminee()).isFalse();
    }

    @Test
    void unSeulSuiviParRoutineEtParJour() {
        service.toggleStep(routine.id(), today, stepId(0));
        service.toggleStep(routine.id(), today, stepId(1));
        service.toggleStep(routine.id(), today, stepId(0));
        em.flush();

        assertThat(runRepository.findAll()).hasSize(1);
        assertThat(service.findForMember(tom, today).getFirst().etat().etapesCochees()).containsExactly(stepId(1));
        // un autre jour repart de zéro
        assertThat(service.findForMember(tom, today.minusDays(1)).getFirst().etat().etapesCochees()).isEmpty();
    }

    @Test
    void seuleLaRoutineDuJourPeutEtreCochee() {
        assertThatThrownBy(() -> service.toggleStep(routine.id(), today.minusDays(1), stepId(0)))
                .isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.toggleStep(routine.id(), today.plusDays(1), stepId(0)))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void recompenseUneFoisApresLaFin() {
        assertThatThrownBy(() -> service.playReward(routine.id(), today)).isInstanceOf(ConflictException.class);

        for (int i = 0; i < 3; i++) {
            service.toggleStep(routine.id(), today, stepId(i));
        }
        assertThat(service.playReward(routine.id(), today).recompenseJouee()).isTrue();
        assertThatThrownBy(() -> service.playReward(routine.id(), today)).isInstanceOf(ConflictException.class);

        // décocher puis recocher ne redonne pas de partie
        service.toggleStep(routine.id(), today, stepId(2));
        RoutineRunDTO finie = service.toggleStep(routine.id(), today, stepId(2));
        assertThat(finie.terminee()).isTrue();
        assertThat(finie.recompenseJouee()).isTrue();
    }

    @Test
    void modifierLesEtapesGardeLesCochesEtRecalculeLaFin() {
        service.toggleStep(routine.id(), today, stepId(0));
        service.toggleStep(routine.id(), today, stepId(1));

        // on retire la 3e étape (non cochée) : la routine du jour devient terminée
        RoutineDTO modifiee = service.update(routine.id(), new RoutineRequest(null, "Matin", null, RoutineType.MORNING,
                RoutineTheme.DAY, EnumSet.of(DayOfWeek.MONDAY), null, null, true,
                List.of(new RoutineStepRequest(stepId(1), "Tanden", "toothbrush", "#ABCDEF"),
                        new RoutineStepRequest(stepId(0), "Opstaan", "wake-up", null))));

        assertThat(modifiee.etapes()).extracting(RoutineStepDTO::id).containsExactly(stepId(1), stepId(0));
        assertThat(modifiee.etapes().getFirst().couleur()).isEqualTo("#ABCDEF");
        assertThat(modifiee.etat().etapesCochees()).containsExactlyInAnyOrder(stepId(0), stepId(1));
        assertThat(modifiee.etat().terminee()).isTrue();
    }

    @Test
    void reordonnerLesEtapes() {
        RoutineDTO reordonnee = service.reorder(routine.id(), List.of(stepId(2), stepId(0), stepId(1)));

        assertThat(reordonnee.etapes()).extracting(RoutineStepDTO::libelle)
                .containsExactly("Ik ben klaar!", "Ik sta op.", "Ik poets mijn tanden.");
        assertThatThrownBy(() -> service.reorder(routine.id(), List.of(stepId(0), stepId(1))))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void modeleCopieDansLaLangueDemandee() {
        RoutineDTO soir = service.applyTemplate(tom, "soir", "nl");

        assertThat(soir.nom()).isEqualTo("Mijn avondroutine");
        assertThat(soir.theme()).isEqualTo(RoutineTheme.NIGHT);
        assertThat(soir.etapes()).hasSize(9);
        assertThat(soir.etapes().getLast().libelle()).isEqualTo("Welterusten!");
        assertThat(service.applyTemplate(tom, "matin", "fr").etapes().getFirst().libelle()).isEqualTo("Je me lève.");
        assertThat(service.findForMember(tom, today)).hasSize(3);
    }

    @Test
    void historiqueDesRoutinesTerminees() {
        for (int i = 0; i < 3; i++) {
            service.toggleStep(routine.id(), today, stepId(i));
        }

        var historique = service.history(tom, 14);

        assertThat(historique).hasSize(14);
        assertThat(historique.getLast().date()).isEqualTo(today);
        assertThat(historique.getLast().routinesTerminees()).containsExactly(routine.id());
        assertThat(historique.getFirst().routinesTerminees()).isEmpty();
    }
}
