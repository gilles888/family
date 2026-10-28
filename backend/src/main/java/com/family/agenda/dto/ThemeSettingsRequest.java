package com.family.agenda.dto;

import com.family.agenda.entity.Saison;
import com.family.agenda.entity.ThemeMode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

@Schema(description = "Modification du thème de la famille")
public record ThemeSettingsRequest(
        @NotNull ThemeMode mode,
        @Schema(description = "Obligatoire en mode FORCE", nullable = true) Saison theme,
        @Schema(description = "Obligatoire si le thème forcé est ANNIVERSAIRE", example = "1", nullable = true) Long membreId,
        @Schema(description = "Dernier jour du thème forcé (pas dans le passé) ; absent = sans limite",
                example = "2026-12-31", nullable = true) LocalDate jusqua,
        @NotNull Boolean anniversairesActifs,
        @NotNull Boolean enfantsPeuventChoisir) {
}
