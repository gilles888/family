package com.family.agenda.dto;

import com.family.agenda.entity.ReminderType;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Reminder")
public record ReminderDTO(
        @Schema(example = "1") Long id,
        @Schema(example = "Football") String titre,
        String description,
        @Schema(example = "SPORT") ReminderType type,
        @Schema(example = "2026-09-22T18:00:00") LocalDateTime dateHeureDebut,
        @Schema(example = "2026-09-22T19:30:00") LocalDateTime dateHeureFin,
        List<FamilyMemberDTO> membres,
        @Schema(name = "isRecurring") @JsonProperty("isRecurring") boolean recurring,
        @Schema(description = "Présent uniquement si isRecurring = true") RecurrenceRuleDTO recurrence) {
}
