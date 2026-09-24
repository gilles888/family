package com.family.agenda.repository;

import com.family.agenda.entity.Recipe;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    List<Recipe> findAllByOrderByNomAscIdAsc();

    List<Recipe> findByNomContainingIgnoreCaseOrderByNomAscIdAsc(String fragment);

    @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
    Optional<Recipe> findWithIngredientsById(Long id);
}
