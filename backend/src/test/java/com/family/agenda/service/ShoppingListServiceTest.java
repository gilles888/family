package com.family.agenda.service;

import com.family.agenda.dto.MealDTO;
import com.family.agenda.dto.MealRequest;
import com.family.agenda.dto.RecipeIngredientRequest;
import com.family.agenda.dto.RecipeRequest;
import com.family.agenda.dto.ShoppingItemDTO;
import com.family.agenda.dto.ShoppingItemRequest;
import com.family.agenda.dto.ShoppingItemSourceDTO;
import com.family.agenda.dto.ShoppingItemStatusRequest;
import com.family.agenda.dto.ShoppingListDTO;
import com.family.agenda.entity.IngredientUnit;
import com.family.agenda.entity.ShoppingItemOrigin;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ResourceNotFoundException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static com.family.agenda.entity.IngredientUnit.G;
import static com.family.agenda.entity.IngredientUnit.KG;
import static com.family.agenda.entity.IngredientUnit.PIECE;
import static com.family.agenda.entity.MealSlot.MIDI;
import static com.family.agenda.entity.MealSlot.SOUPER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Génération, régénération et statuts de la liste de courses (H2, chaque test annulé en fin d'exécution). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@Transactional
class ShoppingListServiceTest {

    private static final LocalDate LUNDI = LocalDate.parse("2026-09-21");
    private static final LocalDate DIMANCHE = LUNDI.plusDays(6);

    @Autowired ShoppingListService service;
    @Autowired PantryService pantryService;
    @Autowired RecipeService recipeService;
    @Autowired MealService mealService;
    @Autowired EntityManager em;

    private Long lasagnes;
    private Long soupe;

    @BeforeEach
    void setUp() {
        lasagnes = recipe("Lasagnes", 4, line("Tomates", "400", G), line("Pâtes à lasagne", "250", G),
                line("Sel", "1", IngredientUnit.PINCEE));
        soupe = recipe("Soupe", 4, line("Tomates", "0.6", KG), line("Oignon", "2", PIECE));
    }

    @Test
    void memeIngredientSurDeuxRecettesUneLigneAvecSesDeuxRepas() {
        meal(LUNDI, SOUPER, 4, lasagnes);
        meal(LUNDI.plusDays(2), MIDI, 4, soupe);

        ShoppingListDTO list = service.generate(LUNDI, DIMANCHE);

        ShoppingItemDTO tomates = item(list, "Tomates");
        assertThat(tomates.quantite()).isEqualByComparingTo("1");
        assertThat(tomates.unite()).isEqualTo(KG);
        assertThat(tomates.origine()).isEqualTo(ShoppingItemOrigin.GENERE);
        assertThat(tomates.sources()).extracting(ShoppingItemSourceDTO::titre).containsExactly("Lasagnes", "Soupe");
        assertThat(list.dateDebut()).isEqualTo(LUNDI);
        assertThat(list.dateFin()).isEqualTo(DIMANCHE);
        assertThat(list.genereLe()).isNotNull();
    }

    @Test
    void repasHorsPeriodeIgnores() {
        meal(LUNDI, SOUPER, 4, lasagnes);
        meal(DIMANCHE.plusDays(1), SOUPER, 4, soupe);

        assertThat(service.generate(LUNDI, DIMANCHE).articles()).extracting(ShoppingItemDTO::nom)
                .doesNotContain("Oignon");
    }

    @Test
    void ingredientsDuGardeMangerArriventDejaALaMaison() {
        meal(LUNDI, SOUPER, 4, lasagnes);

        ShoppingListDTO list = service.generate(LUNDI, DIMANCHE);

        // « Sel » est dans le garde-manger initial (migration V3)
        assertThat(item(list, "Sel").aLaMaison()).isTrue();
        assertThat(item(list, "Tomates").aLaMaison()).isFalse();
    }

    @Test
    void ajoutAuGardeMangerMarqueLesLignesExistantes() {
        meal(LUNDI, SOUPER, 4, lasagnes);
        service.generate(LUNDI, DIMANCHE);

        PantryService.AddResult result = pantryService.add("  pâtes À LASAGNE ");

        assertThat(result.created()).isTrue();
        assertThat(item(service.get(), "Pâtes à lasagne").aLaMaison()).isTrue();
        assertThat(pantryService.add("Pates a lasagne").created()).isFalse();
    }

    @Test
    void regenerationMetAJourLesQuantitesEtAjouteLesNouveauxIngredients() {
        meal(LUNDI, SOUPER, 4, lasagnes);
        service.generate(LUNDI, DIMANCHE);

        meal(LUNDI.plusDays(3), MIDI, 8, soupe);
        ShoppingListDTO list = service.generate(LUNDI, DIMANCHE);

        assertThat(item(list, "Tomates").quantite()).isEqualByComparingTo("1.6");
        assertThat(item(list, "Tomates").unite()).isEqualTo(KG);
        assertThat(item(list, "Oignon").quantite()).isEqualByComparingTo("4");
    }

    @Test
    void regenerationConserveArticlesManuelsEtStatuts() {
        meal(LUNDI, SOUPER, 4, lasagnes);
        ShoppingListDTO first = service.generate(LUNDI, DIMANCHE);
        service.updateStatus(item(first, "Tomates").id(), new ShoppingItemStatusRequest(true, null));
        service.updateStatus(item(first, "Pâtes à lasagne").id(), new ShoppingItemStatusRequest(null, true));
        service.addManual(new ShoppingItemRequest("Papier toilette", null, null));
        service.addManual(new ShoppingItemRequest("Lait", new BigDecimal("2"), IngredientUnit.L));

        meal(LUNDI.plusDays(2), MIDI, 4, soupe);
        ShoppingListDTO list = service.generate(LUNDI, DIMANCHE);

        assertThat(item(list, "Tomates").achete()).isTrue();
        assertThat(item(list, "Tomates").quantite()).isEqualByComparingTo("1");
        assertThat(item(list, "Pâtes à lasagne").aLaMaison()).isTrue();
        assertThat(item(list, "Papier toilette").origine()).isEqualTo(ShoppingItemOrigin.MANUEL);
        assertThat(item(list, "Lait").quantite()).isEqualByComparingTo("2");
    }

    @Test
    void regenerationRetireLesLignesDontLeRepasNExistePlus() {
        MealDTO lundi = meal(LUNDI, SOUPER, 4, lasagnes);
        meal(LUNDI.plusDays(2), MIDI, 4, soupe);
        service.generate(LUNDI, DIMANCHE);

        mealService.delete(lundi.id());
        ShoppingListDTO list = service.generate(LUNDI, DIMANCHE);

        assertThat(list.articles()).extracting(ShoppingItemDTO::nom).containsExactly("Oignon", "Tomates");
        assertThat(item(list, "Tomates").quantite()).isEqualByComparingTo("600");
        assertThat(item(list, "Tomates").sources()).extracting(ShoppingItemSourceDTO::titre).containsExactly("Soupe");
    }

    @Test
    void ligneGenereeSupprimeeNeRevientPasALaRegeneration() {
        meal(LUNDI, SOUPER, 4, lasagnes);
        ShoppingListDTO first = service.generate(LUNDI, DIMANCHE);

        service.delete(item(first, "Tomates").id());
        ShoppingListDTO list = service.generate(LUNDI, DIMANCHE);

        assertThat(list.articles()).extracting(ShoppingItemDTO::nom).doesNotContain("Tomates");
    }

    @Test
    void viderLesAchetesEffaceLesManuelsEtRetireLesGeneres() {
        meal(LUNDI, SOUPER, 4, lasagnes);
        ShoppingListDTO first = service.generate(LUNDI, DIMANCHE);
        Long lait = service.addManual(new ShoppingItemRequest("Lait", null, null)).id();
        service.updateStatus(lait, new ShoppingItemStatusRequest(true, null));
        service.updateStatus(item(first, "Tomates").id(), new ShoppingItemStatusRequest(true, null));

        service.clearBought();
        ShoppingListDTO list = service.generate(LUNDI, DIMANCHE);

        assertThat(list.articles()).extracting(ShoppingItemDTO::nom)
                .containsExactly("Pâtes à lasagne", "Sel");
        assertThatThrownBy(() -> service.delete(lait)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void ligneGenereeModifieeGardeSaQuantiteALaRegeneration() {
        meal(LUNDI, SOUPER, 4, lasagnes);
        ShoppingListDTO first = service.generate(LUNDI, DIMANCHE);
        service.update(item(first, "Tomates").id(), new ShoppingItemRequest("Tomates", new BigDecimal("3"), PIECE));

        meal(LUNDI.plusDays(2), MIDI, 4, soupe);
        ShoppingItemDTO tomates = item(service.generate(LUNDI, DIMANCHE), "Tomates");

        assertThat(tomates.quantite()).isEqualByComparingTo("3");
        assertThat(tomates.unite()).isEqualTo(PIECE);
        assertThat(tomates.modifie()).isTrue();
        assertThat(tomates.sources()).hasSize(2);
    }

    @Test
    void articleManuelPrendLeRayonDeLIngredientConnu() {
        em.createQuery("update Ingredient i set i.rayon = com.family.agenda.entity.Aisle.FRUITS_LEGUMES "
                + "where i.nomNormalise = 'oignon'").executeUpdate();
        em.clear();

        ShoppingItemDTO oignon = service.addManual(new ShoppingItemRequest(" OIGNON ", null, null));

        assertThat(oignon.nom()).isEqualTo("OIGNON");
        assertThat(oignon.rayon()).isNotNull();
    }

    @Test
    void refusUniteSansQuantiteEtPeriodeInvalide() {
        assertThatThrownBy(() -> service.addManual(new ShoppingItemRequest("Lait", null, IngredientUnit.L)))
                .isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.generate(DIMANCHE, LUNDI)).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.generate(LUNDI, LUNDI.plusDays(ShoppingListService.JOURS_MAX)))
                .isInstanceOf(BusinessRuleException.class);
    }

    // ---------- fabriques

    private static RecipeIngredientRequest line(String nom, String quantite, IngredientUnit unite) {
        return new RecipeIngredientRequest(nom, new BigDecimal(quantite), unite);
    }

    private Long recipe(String nom, int portions, RecipeIngredientRequest... lines) {
        return recipeService.create(new RecipeRequest(nom, null, portions, null, null, List.of(lines))).id();
    }

    private MealDTO meal(LocalDate date, com.family.agenda.entity.MealSlot creneau, int portions, Long recetteId) {
        return mealService.create(new MealRequest(date, creneau, portions, recetteId, null));
    }

    private static ShoppingItemDTO item(ShoppingListDTO list, String nom) {
        return list.articles().stream().filter(i -> i.nom().equals(nom)).findFirst()
                .orElseThrow(() -> new AssertionError("Article absent : " + nom + " dans " + list.articles()));
    }
}
