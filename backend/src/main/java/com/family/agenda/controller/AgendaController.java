package com.family.agenda.controller;

import com.family.agenda.dto.AgendaEntryDTO;
import com.family.agenda.dto.AgendaEntryStatusRequest;
import com.family.agenda.dto.YearSummaryDTO;
import com.family.agenda.mapper.AgendaEntryMapper;
import com.family.agenda.service.AgendaQueryService;
import com.family.agenda.service.AgendaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.springframework.format.annotation.DateTimeFormat.ISO.DATE;

@RestController
@RequestMapping(path = "/agenda", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Agenda", description = "Consultation de l'agenda : les AgendaEntry sont persistées, pas calculées à la volée")
public class AgendaController {

    private static final String MEMBRE_ID_DESC = "Ne garder que les entrées concernant ce membre (optionnel)";

    private final AgendaQueryService queryService;
    private final AgendaService agendaService;
    private final AgendaEntryMapper entryMapper;

    @GetMapping
    @Operation(operationId = "listAgenda", summary = "Entrées de l'agenda sur une plage de dates",
            description = "Liste chronologique des AgendaEntry dont la date tombe entre `dateDebut` et `dateFin` (jours inclus).")
    @ApiResponse(responseCode = "400", description = "dateFin antérieure à dateDebut, ou date mal formée")
    public List<AgendaEntryDTO> list(
            @Parameter(description = "Premier jour (ISO, inclus)", example = "2026-09-01", required = true)
            @RequestParam @DateTimeFormat(iso = DATE) LocalDate dateDebut,
            @Parameter(description = "Dernier jour (ISO, inclus)", example = "2026-09-30", required = true)
            @RequestParam @DateTimeFormat(iso = DATE) LocalDate dateFin,
            @Parameter(description = MEMBRE_ID_DESC, example = "1") @RequestParam(required = false) Long membreId) {
        return queryService.findBetween(dateDebut, dateFin, membreId);
    }

    @GetMapping("/jour/{date}")
    @Operation(operationId = "getAgendaJour", summary = "Entrées détaillées d'un jour")
    public List<AgendaEntryDTO> day(
            @Parameter(description = "Jour (ISO)", example = "2026-09-22") @PathVariable @DateTimeFormat(iso = DATE) LocalDate date,
            @Parameter(description = MEMBRE_ID_DESC) @RequestParam(required = false) Long membreId) {
        return queryService.findDay(date, membreId);
    }

    @GetMapping("/semaine/{date}")
    @Operation(operationId = "getAgendaSemaine", summary = "Entrées de la semaine d'une date",
            description = "Entrées de la semaine ISO (lundi à dimanche) qui contient `date`, en ordre chronologique.")
    public List<AgendaEntryDTO> week(
            @Parameter(description = "N'importe quel jour de la semaine (ISO)", example = "2026-09-23")
            @PathVariable @DateTimeFormat(iso = DATE) LocalDate date,
            @Parameter(description = MEMBRE_ID_DESC) @RequestParam(required = false) Long membreId) {
        return queryService.findWeek(date, membreId);
    }

    @GetMapping("/mois/{annee}/{mois}")
    @Operation(operationId = "getAgendaMois", summary = "Entrées d'un mois, groupées par jour",
            description = "Map `date -> entrées`. Seuls les jours ayant au moins une entrée sont présents.",
            responses = @ApiResponse(responseCode = "200", content = @Content(examples = @ExampleObject(value = """
                    {
                      "2026-09-22": [
                        {"id": 1, "reminderId": 1, "titre": "Football", "type": "SPORT",
                         "dateHeure": "2026-09-22T18:00:00", "dateHeureFin": "2026-09-22T19:30:00",
                         "statut": "PREVU", "membres": [{"id": 4, "nom": "Tom", "couleur": "#4CAF50"}], "recurring": true}
                      ]
                    }"""))))
    public Map<LocalDate, List<AgendaEntryDTO>> month(
            @Parameter(example = "2026") @PathVariable @Min(1900) @Max(2200) int annee,
            @Parameter(description = "Mois (1-12)", example = "9") @PathVariable @Min(1) @Max(12) int mois,
            @Parameter(description = MEMBRE_ID_DESC) @RequestParam(required = false) Long membreId) {
        return queryService.findMonth(annee, mois, membreId);
    }

    @GetMapping("/annee/{annee}")
    @Operation(operationId = "getAgendaAnnee", summary = "Résumé annuel",
            description = "Pour chacun des 12 mois : nombre d'entrées, au total et par type de reminder. Sert à la vue annuelle.")
    public YearSummaryDTO year(
            @Parameter(example = "2026") @PathVariable @Min(1900) @Max(2200) int annee,
            @Parameter(description = MEMBRE_ID_DESC) @RequestParam(required = false) Long membreId) {
        return queryService.summarizeYear(annee, membreId);
    }

    @PatchMapping("/entries/{id}")
    @Operation(operationId = "updateEntryStatus", summary = "Changer le statut d'une occurrence",
            description = "Marque UNE entrée comme complétée, annulée ou déplacée, sans toucher aux autres occurrences du reminder.")
    @ApiResponse(responseCode = "404", description = "Entrée introuvable")
    public AgendaEntryDTO updateStatus(@Parameter(description = "Identifiant de l'AgendaEntry", example = "1") @PathVariable Long id,
                                       @Valid @RequestBody AgendaEntryStatusRequest request) {
        return entryMapper.toDto(agendaService.updateStatus(id, request.statut()));
    }
}
