package com.family.agenda.service;

import com.family.agenda.dto.MealDTO;
import com.family.agenda.dto.MealRequest;
import com.family.agenda.dto.RecipeRequest;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static com.family.agenda.entity.MealSlot.MIDI;
import static com.family.agenda.entity.MealSlot.PETIT_DEJEUNER;
import static com.family.agenda.entity.MealSlot.SOUPER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Planification des repas sur H2 (chaque test est annulé en fin d'exécution). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@Transactional
class MealServiceTest {

    private static final LocalDate JOUR = LocalDate.parse("2026-09-24");

    @Autowired MealService service;
    @Autowired RecipeService recipeService;

    private Long bolognaise;

    @BeforeEach
    void setUp() {
        bolognaise = recipeService.create(new RecipeRequest("Spaghetti bolognaise", null, 4, 45, null, null)).id();
    }

    @Test
    void creationAvecRecette() {
        MealDTO meal = service.create(new MealRequest(JOUR, SOUPER, 6, bolognaise, null));

        assertThat(meal.id()).isNotNull();
        assertThat(meal.recetteId()).isEqualTo(bolognaise);
        assertThat(meal.libelle()).isNull();
        assertThat(meal.titre()).isEqualTo("Spaghetti bolognaise");
        assertThat(meal.portions()).isEqualTo(6);
    }

    @Test
    void creationAvecLibelleLibre() {
        MealDTO meal = service.create(new MealRequest(JOUR, MIDI, 4, null, "  Restes "));

        assertThat(meal.recetteId()).isNull();
        assertThat(meal.libelle()).isEqualTo("Restes");
        assertThat(meal.titre()).isEqualTo("Restes");
    }

    @Test
    void refusSiNiRecetteNiLibelle() {
        assertThatThrownBy(() -> service.create(new MealRequest(JOUR, MIDI, 4, null, null)))
                .isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.create(new MealRequest(JOUR, MIDI, 4, null, "   ")))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void refusSiRecetteEtLibelle() {
        assertThatThrownBy(() -> service.create(new MealRequest(JOUR, MIDI, 4, bolognaise, "Restes")))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void refusSiRecetteInconnue() {
        assertThatThrownBy(() -> service.create(new MealRequest(JOUR, MIDI, 4, 999_999L, null)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("999999");
    }

    @Test
    void unSeulRepasParCreneau() {
        service.create(new MealRequest(JOUR, SOUPER, 4, bolognaise, null));

        assertThatThrownBy(() -> service.create(new MealRequest(JOUR, SOUPER, 2, null, "Resto")))
                .isInstanceOf(ConflictException.class);
        // un autre créneau ou un autre jour reste libre
        service.create(new MealRequest(JOUR, MIDI, 2, null, "Resto"));
        service.create(new MealRequest(JOUR.plusDays(1), SOUPER, 2, null, "Resto"));
    }

    @Test
    void modificationPasseDeLaRecetteAuLibelle() {
        MealDTO meal = service.create(new MealRequest(JOUR, SOUPER, 4, bolognaise, null));

        MealDTO modifie = service.update(meal.id(), new MealRequest(JOUR, SOUPER, 3, null, "Pizza"));

        assertThat(modifie.recetteId()).isNull();
        assertThat(modifie.titre()).isEqualTo("Pizza");
        assertThat(modifie.portions()).isEqualTo(3);
    }

    @Test
    void modificationVersUnCreneauOccupeRefusee() {
        service.create(new MealRequest(JOUR, MIDI, 4, null, "Restes"));
        MealDTO souper = service.create(new MealRequest(JOUR, SOUPER, 4, bolognaise, null));

        assertThatThrownBy(() -> service.update(souper.id(), new MealRequest(JOUR, MIDI, 4, bolognaise, null)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void listeTrieeParDatePuisCreneau() {
        service.create(new MealRequest(JOUR.plusDays(1), PETIT_DEJEUNER, 4, null, "Céréales"));
        service.create(new MealRequest(JOUR, SOUPER, 4, bolognaise, null));
        service.create(new MealRequest(JOUR, PETIT_DEJEUNER, 4, null, "Tartines"));
        service.create(new MealRequest(JOUR.plusDays(7), MIDI, 4, null, "Hors plage"));

        assertThat(service.findBetween(JOUR, JOUR.plusDays(6)))
                .extracting(MealDTO::titre)
                .containsExactly("Tartines", "Spaghetti bolognaise", "Céréales");
    }

    @Test
    void plageInvalideRefusee() {
        assertThatThrownBy(() -> service.findBetween(JOUR, JOUR.minusDays(1))).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.findBetween(JOUR, JOUR.plusDays(MealService.JOURS_MAX)))
                .isInstanceOf(BusinessRuleException.class);
    }
}
