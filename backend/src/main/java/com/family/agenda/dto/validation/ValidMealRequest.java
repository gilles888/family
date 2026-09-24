package com.family.agenda.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Un repas a une recette OU un libellé libre (non vide), jamais les deux ni aucun. */
@Documented
@Constraint(validatedBy = MealRequestValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidMealRequest {

    String message() default "une recette OU un libellé libre est obligatoire, pas les deux";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
