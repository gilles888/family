package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.util.List;

@Schema(description = "Prévision d'une journée et tenue conseillée")
public record MeteoJourDTO(
        @Schema(example = "2026-09-24") LocalDate date,
        Ciel ciel,
        @Schema(description = "Température minimale (°C)", example = "9.4", nullable = true) Double temperatureMin,
        @Schema(description = "Température maximale (°C)", example = "19.1", nullable = true) Double temperatureMax,
        @Schema(description = "Température ressentie à l'heure de départ (°C)", example = "10.2", nullable = true) Double ressentiMatin,
        @Schema(description = "Température ressentie maximale entre 10 h et 18 h (°C)", example = "18.6", nullable = true) Double ressentiJournee,
        @Schema(description = "Risque de pluie maximal entre l'heure de départ et 18 h (%)", example = "30", nullable = true) Integer risquePluie,
        @Schema(description = "Tenue conseillée, dans l'ordre d'affichage") List<Vetement> tenue,
        @Schema(description = "Plus chaud l'après-midi : prévoir un pull qu'on pourra enlever", example = "true") boolean superposer) {
}
