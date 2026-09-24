package com.family.agenda.dto;

import com.family.agenda.entity.RecurrenceFrequency;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

@Schema(description = "Règle de récurrence d'un reminder")
public record RecurrenceRuleDTO(
        @Schema(example = "WEEKLY") RecurrenceFrequency frequence,
        @Schema(example = "1") int intervalle,
        @Schema(example = "[\"TUESDAY\", \"THURSDAY\"]") Set<DayOfWeek> joursSemaine,
        @Schema(example = "2027-06-30") LocalDate dateFin,
        @Schema(example = "20") Integer nombreOccurrences) {
}
