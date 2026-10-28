package com.family.agenda.dto;

import com.family.agenda.entity.Saison;
import com.family.agenda.entity.ThemeMode;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

@Schema(description = "Thème de l'application pour la famille")
public record ThemeSettingsDTO(
        @Schema(description = "AUTO : selon la date ; FORCE : thème choisi ; OFF : thème neutre") ThemeMode mode,
        @Schema(description = "Thème forcé (mode FORCE)", nullable = true) Saison theme,
        @Schema(description = "Membre fêté (thème ANNIVERSAIRE forcé)", example = "1", nullable = true) Long membreId,
        @Schema(description = "Dernier jour du thème forcé, absent = sans limite", example = "2026-12-31", nullable = true)
        LocalDate jusqua,
        @Schema(description = "Fêter automatiquement les anniversaires") boolean anniversairesActifs,
        @Schema(description = "Les enfants peuvent choisir leur thème sur leur appareil") boolean enfantsPeuventChoisir) {
}
