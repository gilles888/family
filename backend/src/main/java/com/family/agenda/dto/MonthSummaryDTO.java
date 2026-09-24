package com.family.agenda.dto;

import com.family.agenda.entity.ReminderType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Résumé d'un mois")
public record MonthSummaryDTO(
        @Schema(description = "Numéro du mois (1-12)", example = "9") int mois,
        @Schema(description = "Nombre total d'entrées du mois", example = "9") long total,
        @Schema(description = "Nombre d'entrées par type (types absents = 0)",
                example = "{\"SPORT\": 8, \"TEST_MEDICAL\": 1}") Map<ReminderType, Long> parType) {
}
