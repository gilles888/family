package com.family.agenda.service;

import com.family.agenda.dto.MealDTO;
import com.family.agenda.dto.MealRequest;
import com.family.agenda.dto.RecipeDTO;
import com.family.agenda.dto.RecipeIngredientDTO;
import com.family.agenda.dto.RecipeIngredientRequest;
import com.family.agenda.dto.RecipeRequest;
import com.family.agenda.dto.RecipeSheetDTO;
import com.family.agenda.entity.MealSlot;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.repository.IngredientRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static com.family.agenda.entity.IngredientUnit.BOITE;
import static com.family.agenda.entity.IngredientUnit.G;
import static com.family.agenda.entity.IngredientUnit.PIECE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = "agenda.seed.enabled=false")
@Transactional
class RecipeServiceTest {

    @Autowired RecipeService service;
    @Autowired MealService mealService;
    @Autowired IngredientService ingredientService;
    @Autowired IngredientRepository ingredientRepository;

    private static RecipeIngredientRequest ligne(String nom, String quantite, com.family.agenda.entity.IngredientUnit unite) {
        return new RecipeIngredientRequest(nom, new BigDecimal(quantite), unite);
    }

    private RecipeDTO bolognaise() {
        return service.create(new RecipeRequest("Spaghetti bolognaise", "Le classique", 4, 45, "Mijoter 30 min.",
                List.of(ligne("Spaghetti", "400", G), ligne("Tomates pelées", "1", BOITE), ligne("Oignon", "1", PIECE))));
    }

    @Test
    void creationCreeLesIngredientsALaVoleeDansLOrdre() {
        RecipeDTO recette = bolognaise();

        assertThat(recette.ingredients()).extracting(RecipeIngredientDTO::nom)
                .containsExactly("Spaghetti", "Tomates pelées", "Oignon");
        assertThat(ingredientRepository.count()).isEqualTo(3);
        assertThat(service.findById(recette.id()).ingredients()).hasSize(3);
    }

    @Test
    void ingredientsExistantsReutilisesMalgreCasseEtAccents() {
        bolognaise();
        RecipeDTO sauce = service.create(new RecipeRequest("Sauce tomate", null, 2, null, null,
                List.of(ligne("  tomates  PELEES ", "2", BOITE), ligne("Basilic", "1", PIECE))));

        assertThat(ingredientRepository.count()).isEqualTo(4); // seul « Basilic » est nouveau
        assertThat(sauce.ingredients().getFirst().nom()).isEqualTo("Tomates pelées"); // nom d'origine conservé
        assertThat(ingredientService.search("TOMATE", 10)).extracting(i -> i.nom()).containsExactly("Tomates pelées");
    }

    @Test
    void ingredientEnDoubleRefuse() {
        assertThatThrownBy(() -> service.create(new RecipeRequest("Omelette", null, 2, null, null,
                List.of(ligne("Œufs", "4", PIECE), ligne("œufs", "2", PIECE)))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("double");
    }

    @Test
    void modificationRemplaceLesIngredients() {
        RecipeDTO recette = bolognaise();

        RecipeDTO modifiee = service.update(recette.id(), new RecipeRequest("Spaghetti bolognaise", null, 6, 50, null,
                List.of(ligne("Oignon", "2", PIECE), ligne("Haché bœuf", "500", G))));

        assertThat(modifiee.portions()).isEqualTo(6);
        assertThat(modifiee.ingredients()).extracting(RecipeIngredientDTO::nom).containsExactly("Oignon", "Haché bœuf");
        assertThat(service.findById(recette.id()).ingredients()).extracting(RecipeIngredientDTO::quantite)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("2"), new BigDecimal("500"));
    }

    @Test
    void ficheAuProrataDesPortions() {
        RecipeDTO recette = bolognaise();

        RecipeSheetDTO fiche = service.sheet(recette.id(), 6);

        assertThat(fiche.portionsRecette()).isEqualTo(4);
        assertThat(fiche.portions()).isEqualTo(6);
        assertThat(fiche.ingredients()).extracting(i -> i.quantite().toPlainString()).containsExactly("600", "1.5", "1.5");
        assertThat(service.sheet(recette.id(), null).portions()).isEqualTo(4);
    }

    @Test
    void suppressionConserveLesRepasAvecLeNomDeLaRecette() {
        RecipeDTO recette = bolognaise();
        LocalDate jour = LocalDate.parse("2026-09-24");
        MealDTO meal = mealService.create(new MealRequest(jour, MealSlot.SOUPER, 4, recette.id(), null));

        service.delete(recette.id());

        MealDTO conserve = mealService.findById(meal.id());
        assertThat(conserve.recetteId()).isNull();
        assertThat(conserve.libelle()).isEqualTo("Spaghetti bolognaise");
        assertThatThrownBy(() -> service.findById(recette.id())).isInstanceOf(ResourceNotFoundException.class);
        assertThat(ingredientRepository.count()).isEqualTo(3); // les ingrédients restent réutilisables
    }

    @Test
    void rechercheParNom() {
        bolognaise();
        service.create(new RecipeRequest("Crêpes", null, 4, 20, null, null));

        assertThat(service.findAll("SPAG")).extracting(r -> r.nom()).containsExactly("Spaghetti bolognaise");
        assertThat(service.findAll(null)).extracting(r -> r.nom()).containsExactly("Crêpes", "Spaghetti bolognaise");
    }
}
