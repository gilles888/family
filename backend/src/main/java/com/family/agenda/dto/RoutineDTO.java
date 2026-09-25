package com.family.agenda.dto;

import com.family.agenda.entity.RoutineTheme;
import com.family.agenda.entity.RoutineType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Schema(description = "Routine d'un membre, avec son état pour le jour demandé")
public record RoutineDTO(
        @Schema(example = "3") Long id,
        @Schema(example = "4") Long membreId,
        @Schema(example = "Mijn ochtendroutine") String nom,
        @Schema(example = "Een goede start van de dag!", nullable = true) String sousTitre,
        @Schema(example = "MORNING") RoutineType type,
        @Schema(example = "DAY") RoutineTheme theme,
        @Schema(description = "Jours où la routine est proposée") Set<DayOfWeek> jours,
        @Schema(description = "Début de la plage horaire indicative", example = "06:30", type = "string", nullable = true)
        LocalTime heureDebut,
        @Schema(example = "08:30", type = "string", nullable = true) LocalTime heureFin,
        @Schema(description = "Désactivée = cachée à l'enfant") boolean active,
        @Schema(description = "Ordre d'affichage parmi les routines du membre") int position,
        List<RoutineStepDTO> etapes,
        @Schema(description = "État du jour demandé") RoutineRunDTO etat) {
}
