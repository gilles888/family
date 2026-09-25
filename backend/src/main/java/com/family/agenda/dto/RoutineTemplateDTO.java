package com.family.agenda.dto;

import com.family.agenda.entity.RoutineTheme;
import com.family.agenda.entity.RoutineType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Modèle de routine prêt à l'emploi, copié (modifiable) chez un membre")
public record RoutineTemplateDTO(
        @Schema(example = "matin") String id,
        @Schema(example = "Mijn ochtendroutine") String nom,
        @Schema(example = "Een goede start van de dag!") String sousTitre,
        RoutineType type,
        RoutineTheme theme,
        List<RoutineStepDTO> etapes) {
}
