package com.family.agenda.config;

import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.dto.MealRequest;
import com.family.agenda.dto.RecipeIngredientRequest;
import com.family.agenda.dto.RecipeRequest;
import com.family.agenda.dto.RecurrenceRuleRequest;
import com.family.agenda.dto.ReminderRequest;
import com.family.agenda.dto.ReminderWithAgendaDTO;
import com.family.agenda.entity.Aisle;
import com.family.agenda.entity.IngredientUnit;
import com.family.agenda.entity.MealSlot;
import com.family.agenda.entity.RecurrenceFrequency;
import com.family.agenda.entity.ReminderType;
import com.family.agenda.repository.IngredientRepository;
import com.family.agenda.service.FamilyMemberService;
import com.family.agenda.service.MealService;
import com.family.agenda.service.RoutineService;
import com.family.agenda.service.RecipeService;
import com.family.agenda.service.ReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Données de test (profil dev, {@code agenda.seed.enabled=true}). Elles passent par les services métier :
 * les AgendaEntry sont donc générées exactement comme lors d'un vrai POST /v1/reminders. Les dates sont
 * relatives à aujourd'hui pour que l'agenda ne soit jamais vide.
 */
@Component
@ConditionalOnProperty(name = "agenda.seed.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final FamilyMemberService memberService;
    private final ReminderService reminderService;
    private final RecipeService recipeService;
    private final MealService mealService;
    private final RoutineService routineService;
    private final IngredientRepository ingredientRepository;
    private final Clock clock;

    @Override
    public void run(String... args) {
        if (!memberService.findAll().isEmpty()) {
            log.info("Données de test ignorées : la base contient déjà des membres");
            return;
        }
        LocalDate today = LocalDate.now(clock);

        Long maman = memberService.create(new FamilyMemberRequest("Maman", "#E91E63")).id();
        Long papa = memberService.create(new FamilyMemberRequest("Papa", "#2196F3")).id();
        Long lea = memberService.create(new FamilyMemberRequest("Léa", "#FF9800")).id();
        Long tom = memberService.create(new FamilyMemberRequest("Tom", "#4CAF50")).id();

        // Sport récurrent hebdo, sans fin : Léa, natation tous les mercredis
        report(reminderService.create(new ReminderRequest("Natation", "Piscine municipale", ReminderType.SPORT,
                at(next(today, DayOfWeek.WEDNESDAY), 17, 30), at(next(today, DayOfWeek.WEDNESDAY), 18, 30),
                Set.of(lea), true,
                new RecurrenceRuleRequest(RecurrenceFrequency.WEEKLY, 1, Set.of(DayOfWeek.WEDNESDAY), null, null))));

        // Sport récurrent hebdo sur 2 jours, avec date de fin : Tom et Papa, football mardi + jeudi
        report(reminderService.create(new ReminderRequest("Football", "Entraînement au stade", ReminderType.SPORT,
                at(next(today, DayOfWeek.TUESDAY), 18, 0), at(next(today, DayOfWeek.TUESDAY), 19, 30),
                Set.of(tom, papa), true,
                new RecurrenceRuleRequest(RecurrenceFrequency.WEEKLY, 1, Set.of(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY),
                        today.plusMonths(4), null))));

        // Test médical ponctuel
        report(reminderService.create(new ReminderRequest("Prise de sang", "À jeun, laboratoire du centre-ville",
                ReminderType.TEST_MEDICAL, at(today.plusDays(10), 8, 30), null,
                Set.of(maman), false, null)));

        // Rendez-vous ponctuel
        report(reminderService.create(new ReminderRequest("Dentiste", "Contrôle annuel", ReminderType.RENDEZ_VOUS,
                at(today.plusDays(3), 16, 0), at(today.plusDays(3), 16, 45),
                Set.of(lea, tom), false, null)));

        // Récurrence annuelle
        report(reminderService.create(new ReminderRequest("Anniversaire de Mamie", null, ReminderType.AUTRE,
                at(today.plusDays(20), 12, 0), null,
                Set.of(maman, papa, lea, tom), true,
                new RecurrenceRuleRequest(RecurrenceFrequency.YEARLY, 1, null, null, 10))));

        seedRecipesAndMeals(today);

        // Routines des enfants : les deux modèles, en français pour Léa et en néerlandais pour Tom
        for (String modele : List.of("matin", "soir")) {
            routineService.applyTemplate(lea, modele, "fr");
            routineService.applyTemplate(tom, modele, "nl");
        }
        log.info("Routines du matin et du soir créées pour Léa et Tom");
    }

    /** 3 recettes de démonstration, puis quelques repas dans la semaine en cours (lundi → dimanche). */
    private void seedRecipesAndMeals(LocalDate today) {
        Long bolognaise = recipeService.create(new RecipeRequest("Spaghetti bolognaise", "Le classique du mercredi soir",
                4, 45, """
                Émincer l'oignon et la carotte, les faire revenir 5 min dans l'huile d'olive.
                Ajouter la viande hachée et la faire dorer.
                Verser les tomates pelées, saler, laisser mijoter 30 min à couvert.
                Cuire les spaghetti al dente et servir avec la sauce.""",
                List.of(ingredient("Spaghetti", "400", IngredientUnit.G),
                        ingredient("Haché bœuf", "500", IngredientUnit.G),
                        ingredient("Tomates pelées", "1", IngredientUnit.BOITE),
                        ingredient("Oignon", "1", IngredientUnit.PIECE),
                        ingredient("Carotte", "1", IngredientUnit.PIECE),
                        ingredient("Huile d'olive", "2", IngredientUnit.CUILLERE_SOUPE),
                        ingredient("Sel", "1", IngredientUnit.PINCEE)))).id();

        Long crepes = recipeService.create(new RecipeRequest("Crêpes", "Pour le goûter ou le dimanche matin",
                4, 20, """
                Mélanger la farine, le sucre et le sel ; creuser un puits et y casser les œufs.
                Verser le lait petit à petit en fouettant, puis le beurre fondu.
                Laisser reposer 1 h, puis cuire à la poêle bien chaude.""",
                List.of(ingredient("Farine", "250", IngredientUnit.G),
                        ingredient("Œufs", "4", IngredientUnit.PIECE),
                        ingredient("Lait", "500", IngredientUnit.ML),
                        ingredient("Beurre", "50", IngredientUnit.G),
                        ingredient("Sucre", "1", IngredientUnit.CUILLERE_SOUPE),
                        ingredient("Sel", "1", IngredientUnit.PINCEE)))).id();

        Long soupe = recipeService.create(new RecipeRequest("Soupe de légumes", "Idéale quand il fait froid",
                6, 40, """
                Éplucher et couper les légumes en morceaux.
                Les mettre dans une grande casserole avec l'eau et le bouillon.
                Cuire 30 min à feu moyen, puis mixer.""",
                List.of(ingredient("Carotte", "4", IngredientUnit.PIECE),
                        ingredient("Poireau", "1", IngredientUnit.PIECE),
                        ingredient("Pommes de terre", "3", IngredientUnit.PIECE),
                        ingredient("Oignon", "1", IngredientUnit.PIECE),
                        ingredient("Cube de bouillon", "1", IngredientUnit.PIECE),
                        ingredient("Eau", "1.5", IngredientUnit.L)))).id();

        // Rayons : les recettes créent les ingrédients sans rayon (l'interface ne le propose pas encore)
        Map<String, Aisle> rayons = Map.ofEntries(
                Map.entry("spaghetti", Aisle.EPICERIE), Map.entry("hache boeuf", Aisle.BOUCHERIE_POISSONNERIE),
                Map.entry("tomates pelees", Aisle.EPICERIE), Map.entry("oignon", Aisle.FRUITS_LEGUMES),
                Map.entry("carotte", Aisle.FRUITS_LEGUMES), Map.entry("huile d'olive", Aisle.EPICERIE),
                Map.entry("sel", Aisle.EPICERIE), Map.entry("farine", Aisle.EPICERIE), Map.entry("oeufs", Aisle.CREMERIE),
                Map.entry("lait", Aisle.CREMERIE), Map.entry("beurre", Aisle.CREMERIE), Map.entry("sucre", Aisle.EPICERIE),
                Map.entry("poireau", Aisle.FRUITS_LEGUMES), Map.entry("pommes de terre", Aisle.FRUITS_LEGUMES),
                Map.entry("cube de bouillon", Aisle.EPICERIE), Map.entry("eau", Aisle.BOISSONS));
        var ingredients = ingredientRepository.findAll();
        ingredients.forEach(i -> i.setRayon(rayons.get(i.getNomNormalise())));
        ingredientRepository.saveAll(ingredients);

        LocalDate lundi = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        mealService.create(new MealRequest(lundi, MealSlot.SOUPER, 4, bolognaise, null));
        mealService.create(new MealRequest(lundi.plusDays(1), MealSlot.SOUPER, 4, null, "Restes"));
        mealService.create(new MealRequest(lundi.plusDays(2), MealSlot.MIDI, 4, crepes, null));
        mealService.create(new MealRequest(lundi.plusDays(3), MealSlot.SOUPER, 6, soupe, null));
        mealService.create(new MealRequest(lundi.plusDays(4), MealSlot.SOUPER, 4, null, "Resto"));
        mealService.create(new MealRequest(lundi.plusDays(6), MealSlot.PETIT_DEJEUNER, 6, crepes, null));
        log.info("3 recettes et 6 repas de démonstration créés (semaine du {})", lundi);
    }

    private static RecipeIngredientRequest ingredient(String nom, String quantite, IngredientUnit unite) {
        return new RecipeIngredientRequest(nom, new BigDecimal(quantite), unite);
    }

    private void report(ReminderWithAgendaDTO created) {
        log.info("Reminder '{}' créé : {} entrée(s) d'agenda, du {} au {}", created.reminder().titre(),
                created.agenda().nombre(), created.agenda().premiereDate(), created.agenda().derniereDate());
    }

    private static LocalDate next(LocalDate from, DayOfWeek day) {
        return from.with(TemporalAdjusters.next(day));
    }

    private static LocalDateTime at(LocalDate date, int hour, int minute) {
        return LocalDateTime.of(date, LocalTime.of(hour, minute));
    }
}
