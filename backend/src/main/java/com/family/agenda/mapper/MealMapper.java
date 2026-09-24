package com.family.agenda.mapper;

import com.family.agenda.dto.MealDTO;
import com.family.agenda.entity.Meal;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** La recette et le libellé sont résolus par MealService (l'un exclut l'autre). */
@Mapper
public interface MealMapper {

    @Mapping(target = "recetteId", source = "recipe.id")
    @Mapping(target = "titre", expression = "java(meal.getRecipe() != null ? meal.getRecipe().getNom() : meal.getLibelle())")
    MealDTO toDto(Meal meal);
}
