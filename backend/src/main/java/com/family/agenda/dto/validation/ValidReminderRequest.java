package com.family.agenda.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Cohérence globale d'un ReminderRequest : dates, présence/contenu de la règle de récurrence. */
@Documented
@Constraint(validatedBy = ReminderRequestValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidReminderRequest {

    String message() default "reminder incohérent";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
