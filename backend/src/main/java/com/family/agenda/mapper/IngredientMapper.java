package com.family.agenda.mapper;

import com.family.agenda.dto.IngredientDTO;
import com.family.agenda.entity.Ingredient;
import org.mapstruct.Mapper;

@Mapper
public interface IngredientMapper {

    IngredientDTO toDto(Ingredient ingredient);
}
