package com.family.agenda.mapper;

import com.family.agenda.dto.RecipeDTO;
import com.family.agenda.dto.RecipeIngredientDTO;
import com.family.agenda.dto.RecipeRequest;
import com.family.agenda.dto.RecipeSummaryDTO;
import com.family.agenda.entity.Recipe;
import com.family.agenda.entity.RecipeIngredient;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/** Les lignes d'ingrédients sont construites par RecipeService (résolution / création des ingrédients). */
@Mapper
public interface RecipeMapper {

    RecipeDTO toDto(Recipe recipe);

    RecipeSummaryDTO toSummary(Recipe recipe);

    @Mapping(target = "ingredientId", source = "ingredient.id")
    @Mapping(target = "nom", source = "ingredient.nom")
    @Mapping(target = "rayon", source = "ingredient.rayon")
    RecipeIngredientDTO toDto(RecipeIngredient line);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ingredients", ignore = true)
    Recipe toEntity(RecipeRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ingredients", ignore = true)
    void update(RecipeRequest request, @MappingTarget Recipe recipe);
}
