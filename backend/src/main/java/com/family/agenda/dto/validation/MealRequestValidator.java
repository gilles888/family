package com.family.agenda.dto.validation;

import com.family.agenda.dto.MealRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class MealRequestValidator implements ConstraintValidator<ValidMealRequest, MealRequest> {

    @Override
    public boolean isValid(MealRequest r, ConstraintValidatorContext ctx) {
        if (r == null) {
            return true;
        }
        boolean recette = r.recetteId() != null;
        boolean libelle = r.libelle() != null && !r.libelle().isBlank();
        if (recette == libelle) {
            ctx.disableDefaultConstraintViolation();
            ctx.buildConstraintViolationWithTemplate(ctx.getDefaultConstraintMessageTemplate())
                    .addPropertyNode("recetteId")
                    .addConstraintViolation();
            return false;
        }
        return true;
    }
}
