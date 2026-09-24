package com.family.agenda.dto.validation;

import com.family.agenda.dto.RecurrenceRuleRequest;
import com.family.agenda.dto.ReminderRequest;
import com.family.agenda.entity.RecurrenceFrequency;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ReminderRequestValidator implements ConstraintValidator<ValidReminderRequest, ReminderRequest> {

    @Override
    public boolean isValid(ReminderRequest r, ConstraintValidatorContext ctx) {
        if (r == null) {
            return true;
        }
        ctx.disableDefaultConstraintViolation();
        boolean valid = true;

        if (r.dateHeureDebut() != null && r.dateHeureFin() != null && r.dateHeureFin().isBefore(r.dateHeureDebut())) {
            valid = violation(ctx, "dateHeureFin doit être postérieure ou égale à dateHeureDebut", "dateHeureFin");
        }

        RecurrenceRuleRequest rule = r.recurrence();
        if (r.recurring() && rule == null) {
            return violation(ctx, "recurrence est obligatoire quand isRecurring vaut true", "recurrence");
        }
        if (!r.recurring() && rule != null) {
            return violation(ctx, "recurrence doit être absente quand isRecurring vaut false", "recurrence");
        }
        if (rule == null) {
            return valid;
        }

        if (rule.dateFin() != null && rule.nombreOccurrences() != null) {
            valid = violation(ctx, "dateFin et nombreOccurrences sont mutuellement exclusifs", "recurrence", "dateFin");
        }
        if (rule.dateFin() != null && r.dateHeureDebut() != null
                && rule.dateFin().isBefore(r.dateHeureDebut().toLocalDate())) {
            valid = violation(ctx, "dateFin doit être postérieure ou égale à la date de début", "recurrence", "dateFin");
        }
        if (rule.frequence() != RecurrenceFrequency.WEEKLY && rule.joursSemaine() != null
                && !rule.joursSemaine().isEmpty()) {
            valid = violation(ctx, "joursSemaine n'est applicable qu'à la fréquence WEEKLY", "recurrence", "joursSemaine");
        }
        return valid;
    }

    private boolean violation(ConstraintValidatorContext ctx, String message, String... path) {
        var builder = ctx.buildConstraintViolationWithTemplate(message);
        var node = builder.addPropertyNode(path[0]);
        for (int i = 1; i < path.length; i++) {
            node = node.addPropertyNode(path[i]);
        }
        node.addConstraintViolation();
        return false;
    }
}
