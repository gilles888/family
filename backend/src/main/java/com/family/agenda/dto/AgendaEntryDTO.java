package com.family.agenda.dto;

import com.family.agenda.entity.EntryStatus;
import com.family.agenda.entity.ReminderType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Occurrence d'un reminder dans l'agenda")
public record AgendaEntryDTO(
        @Schema(description = "Identifiant de l'entrée (à utiliser pour le PATCH de statut)", example = "42") Long id,
        @Schema(example = "1") Long reminderId,
        @Schema(example = "Football") String titre,
        String description,
        @Schema(example = "SPORT") ReminderType type,
        @Schema(description = "Date/heure de cette occurrence", example = "2026-09-22T18:00:00") LocalDateTime dateHeure,
        @Schema(description = "Fin de cette occurrence (null si le reminder n'a pas de fin)", example = "2026-09-22T19:30:00")
        LocalDateTime dateHeureFin,
        @Schema(example = "PREVU") EntryStatus statut,
        @Schema(description = "Membres concernés") List<FamilyMemberDTO> membres,
        @Schema(description = "L'entrée provient d'un reminder récurrent") boolean recurring) {
}
