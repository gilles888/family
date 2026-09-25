package com.family.agenda.mapper;

import com.family.agenda.dto.PantryItemDTO;
import com.family.agenda.dto.ShoppingItemDTO;
import com.family.agenda.dto.ShoppingItemSourceDTO;
import com.family.agenda.entity.PantryItem;
import com.family.agenda.entity.ShoppingItem;
import com.family.agenda.entity.ShoppingItemSource;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface ShoppingMapper {

    @Mapping(target = "rayon", source = "ingredient.rayon")
    // Lombok génère isALaMaison() : la propriété source s'appelle « ALaMaison »
    @Mapping(target = "aLaMaison", source = "ALaMaison")
    ShoppingItemDTO toDto(ShoppingItem item);

    ShoppingItemSourceDTO toDto(ShoppingItemSource source);

    PantryItemDTO toDto(PantryItem item);
}
