package com.family.agenda.service;

import com.family.agenda.entity.Ingredient;
import com.family.agenda.entity.IngredientUnit;
import com.family.agenda.entity.Meal;
import com.family.agenda.entity.Recipe;
import com.family.agenda.entity.RecipeIngredient;
import com.family.agenda.entity.ShoppingItemSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Additionne les ingrédients des repas planifiés (calcul pur, sans base de données).
 * <ul>
 *   <li>quantités proratisées aux portions du repas (recette pour 4, repas pour 6 → × 1,5) ;</li>
 *   <li>même ingrédient (nom normalisé) + unités compatibles → une ligne : g et kg, ml et l se convertissent,
 *       les autres unités ne s'additionnent qu'avec elles-mêmes ;</li>
 *   <li>unités incompatibles (2 pièces et 200 g) → lignes séparées, plutôt qu'une somme fausse ;</li>
 *   <li>repas en libellé libre (« Restes ») ignorés : ils n'ont pas d'ingrédients.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class ShoppingListAggregator {

    /** Précision de la colonne shopping_item.quantite. */
    static final int DECIMALES = 3;
    private static final BigDecimal MILLE = BigDecimal.valueOf(1000);

    private final PortionCalculator portionCalculator;

    /**
     * Ligne agrégée.
     *
     * @param cle      nom normalisé + famille d'unité (« tomate|G ») : identifie la ligne d'une génération à l'autre
     * @param sources  repas qui l'utilisent, par date puis créneau, chacun une fois
     */
    public record AggregatedLine(String cle, Ingredient ingredient, BigDecimal quantite, IngredientUnit unite,
                                 List<ShoppingItemSource> sources) {
    }

    /** Lignes par ordre alphabétique d'ingrédient. */
    public List<AggregatedLine> aggregate(Collection<Meal> meals) {
        Map<String, Accumulator> parCle = new LinkedHashMap<>();
        meals.stream()
                .filter(meal -> meal.getRecipe() != null)
                .sorted(Comparator.comparing(Meal::getDate).thenComparing(Meal::getCreneau))
                .forEach(meal -> {
                    Recipe recipe = meal.getRecipe();
                    for (RecipeIngredient line : recipe.getIngredients()) {
                        BigDecimal quantite = portionCalculator.proratiser(line.getQuantite(), recipe.getPortions(),
                                meal.getPortions());
                        IngredientUnit base = uniteDeBase(line.getUnite());
                        parCle.computeIfAbsent(cle(line.getIngredient().getNomNormalise(), base),
                                        c -> new Accumulator(c, line.getIngredient(), base))
                                .ajouter(quantite.multiply(facteur(line.getUnite())), meal);
                    }
                });
        return parCle.values().stream()
                .map(Accumulator::toLine)
                .sorted(Comparator.comparing((AggregatedLine l) -> l.ingredient().getNom(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(AggregatedLine::cle))
                .toList();
    }

    static String cle(String nomNormalise, IngredientUnit uniteDeBase) {
        return nomNormalise + "|" + uniteDeBase.name();
    }

    /** Unité dans laquelle on additionne : g pour les masses, ml pour les volumes, l'unité elle-même sinon. */
    static IngredientUnit uniteDeBase(IngredientUnit unite) {
        return switch (unite) {
            case G, KG -> IngredientUnit.G;
            case ML, L -> IngredientUnit.ML;
            default -> unite;
        };
    }

    private static BigDecimal facteur(IngredientUnit unite) {
        return unite == IngredientUnit.KG || unite == IngredientUnit.L ? MILLE : BigDecimal.ONE;
    }

    /** 1 000 g et plus s'affichent en kg, 1 000 ml et plus en l. */
    private static AggregatedLine afficher(String cle, Ingredient ingredient, BigDecimal total, IngredientUnit base,
                                           List<ShoppingItemSource> sources) {
        BigDecimal quantite = total;
        IngredientUnit unite = base;
        if (total.compareTo(MILLE) >= 0 && (base == IngredientUnit.G || base == IngredientUnit.ML)) {
            quantite = total.divide(MILLE);
            unite = base == IngredientUnit.G ? IngredientUnit.KG : IngredientUnit.L;
        }
        return new AggregatedLine(cle, ingredient, arrondir(quantite), unite, List.copyOf(sources));
    }

    /** 3 décimales au plus, sans zéros inutiles (1.500 → 1.5, 600 et non 6E+2). */
    static BigDecimal arrondir(BigDecimal quantite) {
        BigDecimal resultat = quantite.setScale(DECIMALES, RoundingMode.HALF_UP).stripTrailingZeros();
        return resultat.scale() < 0 ? resultat.setScale(0) : resultat;
    }

    private static final class Accumulator {
        private final String cle;
        private final Ingredient ingredient;
        private final IngredientUnit base;
        private BigDecimal total = BigDecimal.ZERO;
        private final List<ShoppingItemSource> sources = new ArrayList<>();

        Accumulator(String cle, Ingredient ingredient, IngredientUnit base) {
            this.cle = cle;
            this.ingredient = ingredient;
            this.base = base;
        }

        void ajouter(BigDecimal quantite, Meal meal) {
            total = total.add(quantite);
            // Un ingrédient présent deux fois dans la même recette ne cite le repas qu'une fois
            if (sources.stream().noneMatch(s -> s.repasId().equals(meal.getId()))) {
                sources.add(new ShoppingItemSource(meal.getId(), meal.getDate(), meal.getCreneau(),
                        meal.getRecipe().getNom()));
            }
        }

        AggregatedLine toLine() {
            return afficher(cle, ingredient, total, base, sources);
        }
    }
}
