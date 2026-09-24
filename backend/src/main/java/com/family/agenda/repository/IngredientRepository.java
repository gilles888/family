package com.family.agenda.repository;

import com.family.agenda.entity.Ingredient;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {

    Optional<Ingredient> findByNomNormalise(String nomNormalise);

    List<Ingredient> findByNomNormaliseIn(Collection<String> nomsNormalises);

    List<Ingredient> findByNomNormaliseContainingOrderByNomAsc(String fragment, Limit limit);
}
