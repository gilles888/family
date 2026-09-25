package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Liste de courses de la famille : articles générés depuis les repas et articles ajoutés à la main")
public record ShoppingListDTO(
        @Schema(description = "Début de la période générée, absent si la liste n'a jamais été générée",
                example = "2026-09-25", nullable = true) LocalDate dateDebut,
        @Schema(example = "2026-10-02", nullable = true) LocalDate dateFin,
        @Schema(example = "2026-09-25T18:30:00", nullable = true) LocalDateTime genereLe,
        @Schema(description = "Articles, par ordre alphabétique (les lignes retirées n'y figurent pas)")
        List<ShoppingItemDTO> articles) {
}
