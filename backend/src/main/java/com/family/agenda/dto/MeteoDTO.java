package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Météo d'aujourd'hui et de demain")
public record MeteoDTO(
        @Schema(example = "Bruxelles") String lieu,
        @Schema(description = "Aujourd'hui puis demain") List<MeteoJourDTO> jours) {
}
