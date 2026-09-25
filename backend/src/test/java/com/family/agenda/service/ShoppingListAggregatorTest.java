package com.family.agenda.service;

import com.family.agenda.entity.Ingredient;
import com.family.agenda.entity.IngredientUnit;
import com.family.agenda.entity.Meal;
import com.family.agenda.entity.MealSlot;
import com.family.agenda.entity.Recipe;
import com.family.agenda.entity.RecipeIngredient;
import com.family.agenda.entity.ShoppingItemSource;
import com.family.agenda.service.ShoppingListAggregator.AggregatedLine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static com.family.agenda.entity.IngredientUnit.G;
import static com.family.agenda.entity.IngredientUnit.KG;
import static com.family.agenda.entity.IngredientUnit.L;
import static com.family.agenda.entity.IngredientUnit.ML;
import static com.family.agenda.entity.IngredientUnit.PIECE;
import static com.family.agenda.entity.MealSlot.MIDI;
import static com.family.agenda.entity.MealSlot.SOUPER;
import static org.assertj.core.api.Assertions.assertThat;

/** Agrégation des ingrédients des repas (calcul pur). */
class ShoppingListAggregatorTest {

    private static final LocalDate LUNDI = LocalDate.parse("2026-09-21");

    private final ShoppingListAggregator aggregator = new ShoppingListAggregator(new PortionCalculator());

    private final Ingredient tomate = ingredient("Tomates", "tomates");
    private final Ingredient farine = ingredient("Farine", "farine");
    private final Ingredient lait = ingredient("Lait", "lait");
    private final Ingredient oignon = ingredient("Oignon", "oignon");

    private long nextMealId = 1;

    @Test
    void memeIngredientSurDeuxRecettesAdditionneEtCiteLesDeuxRepas() {
        Recipe lasagnes = recipe("Lasagnes", 4, line(tomate, "400", G));
        Recipe soupe = recipe("Soupe", 4, line(tomate, "300", G));

        List<AggregatedLine> lines = aggregator.aggregate(List.of(
                meal(LUNDI.plusDays(2), MIDI, 4, soupe),
                meal(LUNDI, SOUPER, 4, lasagnes)));

        assertThat(lines).singleElement().satisfies(l -> {
            assertThat(l.quantite()).isEqualByComparingTo("700");
            assertThat(l.unite()).isEqualTo(G);
            assertThat(l.cle()).isEqualTo("tomates|G");
            // par date, quel que soit l'ordre d'entrée
            assertThat(l.sources()).extracting(ShoppingItemSource::titre).containsExactly("Lasagnes", "Soupe");
        });
    }

    @Test
    void quantitesProratiseesAuxPortionsDuRepas() {
        Recipe crepes = recipe("Crêpes", 4, line(farine, "250", G));

        List<AggregatedLine> lines = aggregator.aggregate(List.of(meal(LUNDI, MIDI, 6, crepes)));

        assertThat(lines.getFirst().quantite()).isEqualByComparingTo("375");
    }

    @Test
    void grammesEtKilosSAdditionnentEtPassentEnKiloAuDelaDeMille() {
        Recipe a = recipe("Pain", 1, line(farine, "0.5", KG));
        Recipe b = recipe("Crêpes", 1, line(farine, "750", G));

        List<AggregatedLine> lines = aggregator.aggregate(List.of(meal(LUNDI, MIDI, 1, a), meal(LUNDI, SOUPER, 1, b)));

        assertThat(lines).singleElement().satisfies(l -> {
            assertThat(l.quantite()).isEqualByComparingTo("1.25");
            assertThat(l.unite()).isEqualTo(KG);
            assertThat(l.cle()).isEqualTo("farine|G");
        });
    }

    @Test
    void millilitresEtLitresSAdditionnent() {
        Recipe a = recipe("Crêpes", 1, line(lait, "0.5", L));
        Recipe b = recipe("Purée", 1, line(lait, "200", ML));

        List<AggregatedLine> lines = aggregator.aggregate(List.of(meal(LUNDI, MIDI, 1, a), meal(LUNDI, SOUPER, 1, b)));

        assertThat(lines).singleElement().satisfies(l -> {
            assertThat(l.quantite()).isEqualByComparingTo("700");
            assertThat(l.unite()).isEqualTo(ML);
        });
    }

    @Test
    void unitesIncompatiblesRestentSurDesLignesSeparees() {
        Recipe a = recipe("Soupe", 1, line(oignon, "2", PIECE));
        Recipe b = recipe("Tarte", 1, line(oignon, "200", G));

        List<AggregatedLine> lines = aggregator.aggregate(List.of(meal(LUNDI, MIDI, 1, a), meal(LUNDI, SOUPER, 1, b)));

        assertThat(lines).extracting(AggregatedLine::unite).containsExactlyInAnyOrder(PIECE, G);
        assertThat(lines).extracting(AggregatedLine::quantite).map(BigDecimal::toPlainString)
                .containsExactlyInAnyOrder("2", "200");
    }

    @Test
    void repasEnLibelleLibreIgnores() {
        Meal restes = meal(LUNDI, MIDI, 4, null);
        restes.setLibelle("Restes");

        assertThat(aggregator.aggregate(List.of(restes))).isEmpty();
    }

    @Test
    void ingredientDeuxFoisDansLaRecetteCiteLeRepasUneSeuleFois() {
        Recipe tarte = recipe("Tarte", 1, line(farine, "200", G), line(farine, "50", G));

        List<AggregatedLine> lines = aggregator.aggregate(List.of(meal(LUNDI, MIDI, 1, tarte)));

        assertThat(lines).singleElement().satisfies(l -> {
            assertThat(l.quantite()).isEqualByComparingTo("250");
            assertThat(l.sources()).hasSize(1);
        });
    }

    @Test
    void lignesParOrdreAlphabetique() {
        Recipe r = recipe("Tout", 1, line(tomate, "1", PIECE), line(farine, "1", G), line(lait, "1", L));

        assertThat(aggregator.aggregate(List.of(meal(LUNDI, MIDI, 1, r))))
                .extracting(l -> l.ingredient().getNom())
                .containsExactly("Farine", "Lait", "Tomates");
    }

    // ---------- fabriques

    private static Ingredient ingredient(String nom, String nomNormalise) {
        return new Ingredient(nom, nomNormalise);
    }

    private static RecipeIngredient line(Ingredient ingredient, String quantite, IngredientUnit unite) {
        RecipeIngredient line = new RecipeIngredient();
        line.setIngredient(ingredient);
        line.setQuantite(new BigDecimal(quantite));
        line.setUnite(unite);
        return line;
    }

    private static Recipe recipe(String nom, int portions, RecipeIngredient... lines) {
        Recipe recipe = new Recipe();
        recipe.setNom(nom);
        recipe.setPortions(portions);
        for (RecipeIngredient line : lines) {
            line.setRecipe(recipe);
            recipe.getIngredients().add(line);
        }
        return recipe;
    }

    private Meal meal(LocalDate date, MealSlot creneau, int portions, Recipe recipe) {
        Meal meal = new Meal();
        meal.setId(nextMealId++);
        meal.setDate(date);
        meal.setCreneau(creneau);
        meal.setPortions(portions);
        meal.setRecipe(recipe);
        return meal;
    }
}
