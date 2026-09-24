package com.family.agenda.dto;

import com.family.agenda.entity.RecurrenceFrequency;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

@Schema(description = "Règle de récurrence. Fin : dateFin OU nombreOccurrences (pas les deux) ; aucune des deux = sans fin.")
public record RecurrenceRuleRequest(
        @Schema(description = "Fréquence", example = "WEEKLY")
        @NotNull RecurrenceFrequency frequence,
        @Schema(description = "Tous les N jours/semaines/mois/ans (défaut 1)", example = "1", defaultValue = "1")
        @Min(1) @Max(365) Integer intervalle,
        @Schema(description = "Jours de la semaine (WEEKLY uniquement). Vide = jour de la date de début.",
                example = "[\"TUESDAY\", \"THURSDAY\"]")
        Set<DayOfWeek> joursSemaine,
        @Schema(description = "Dernière date incluse de la récurrence", example = "2027-06-30")
        LocalDate dateFin,
        @Schema(description = "Nombre total d'occurrences (la première comprise)", example = "20")
        @Min(1) Integer nombreOccurrences) {
}
