package com.family.agenda.dto;

import com.family.agenda.entity.EntryStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Nouveau statut d'une occurrence", example = "{\"statut\": \"ANNULE\"}")
public record AgendaEntryStatusRequest(
        @Schema(description = "PREVU, COMPLETE, ANNULE ou DEPLACE", example = "ANNULE") @NotNull EntryStatus statut) {
}
