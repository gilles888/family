package com.family.agenda.repository;

import com.family.agenda.entity.Meal;
import com.family.agenda.entity.MealSlot;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MealRepository extends JpaRepository<Meal, Long> {

    /** Trié par date puis créneau (ordre de l'enum : le tri se fait en Java, voir MealService). */
    @EntityGraph(attributePaths = "recipe")
    List<Meal> findByDateBetween(LocalDate debut, LocalDate fin);

    /** Liste de courses : repas de la plage avec leur recette et ses ingrédients, en une requête. */
    @EntityGraph(attributePaths = {"recipe", "recipe.ingredients", "recipe.ingredients.ingredient"})
    List<Meal> findWithIngredientsByDateBetween(LocalDate debut, LocalDate fin);

    boolean existsByDateAndCreneauAndIdNot(LocalDate date, MealSlot creneau, Long id);

    boolean existsByDateAndCreneau(LocalDate date, MealSlot creneau);

    /** Avant suppression d'une recette : ses repas gardent son nom comme libellé libre. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Meal m set m.libelle = :libelle, m.recipe = null where m.recipe.id = :recipeId")
    int detachRecipe(@Param("recipeId") Long recipeId, @Param("libelle") String libelle);
}
