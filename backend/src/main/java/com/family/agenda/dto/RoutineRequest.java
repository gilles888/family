package com.family.agenda.dto;

import com.family.agenda.entity.RoutineTheme;
import com.family.agenda.entity.RoutineType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Schema(description = "Création / modification d'une routine (les étapes sont remplacées par la liste donnée)", example = """
        { "membreId": 4, "nom": "Mijn ochtendroutine", "sousTitre": "Een goede start van de dag!", "type": "MORNING",
          "theme": "DAY", "jours": ["MONDAY", "TUESDAY"], "heureDebut": "06:30", "heureFin": "08:30", "active": true,
          "etapes": [ { "libelle": "Ik sta op.", "icone": "wake-up" } ] }""")
public record RoutineRequest(
        @Schema(description = "Membre (création uniquement ; ignoré en modification)", example = "4") Long membreId,
        @NotBlank @Size(max = 100) String nom,
        @Size(max = 150) String sousTitre,
        @NotNull RoutineType type,
        @NotNull RoutineTheme theme,
        @Schema(description = "Jours où la routine est proposée") @NotNull Set<DayOfWeek> jours,
        @Schema(type = "string", example = "06:30", nullable = true) LocalTime heureDebut,
        @Schema(type = "string", example = "08:30", nullable = true) LocalTime heureFin,
        @Schema(description = "Absent = active") Boolean active,
        @Size(max = 30) List<@NotNull @Valid RoutineStepRequest> etapes) {
}
