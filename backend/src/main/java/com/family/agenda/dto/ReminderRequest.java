package com.family.agenda.dto;

import com.family.agenda.dto.validation.ValidReminderRequest;
import com.family.agenda.entity.ReminderType;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Set;

@ValidReminderRequest
@Schema(description = "Création / modification d'un reminder. Les AgendaEntry sont générées automatiquement.",
        example = """
                {
                  "titre": "Football",
                  "description": "Entraînement au stade",
                  "type": "SPORT",
                  "dateHeureDebut": "2026-09-22T18:00:00",
                  "dateHeureFin": "2026-09-22T19:30:00",
                  "membreIds": [1],
                  "isRecurring": true,
                  "recurrence": {
                    "frequence": "WEEKLY",
                    "intervalle": 1,
                    "joursSemaine": ["TUESDAY", "THURSDAY"]
                  }
                }""")
public record ReminderRequest(
        @NotBlank @Size(max = 200) String titre,
        @Size(max = 2000) String description,
        @NotNull ReminderType type,
        @Schema(description = "Début de la 1re occurrence", example = "2026-09-22T18:00:00")
        @NotNull LocalDateTime dateHeureDebut,
        @Schema(description = "Fin (optionnelle) de la 1re occurrence ; sert à calculer la durée", example = "2026-09-22T19:30:00")
        LocalDateTime dateHeureFin,
        @Schema(description = "Identifiants des membres concernés")
        Set<Long> membreIds,
        @Schema(description = "Reminder récurrent ? Si vrai, 'recurrence' est obligatoire.", name = "isRecurring")
        @JsonProperty("isRecurring") boolean recurring,
        @Valid RecurrenceRuleRequest recurrence) {
}
