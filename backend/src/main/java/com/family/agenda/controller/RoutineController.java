package com.family.agenda.controller;

import com.family.agenda.dto.RoutineDTO;
import com.family.agenda.dto.RoutineRequest;
import com.family.agenda.dto.RoutineRunDTO;
import com.family.agenda.dto.RoutineTemplateDTO;
import com.family.agenda.service.RoutineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import static org.springframework.format.annotation.DateTimeFormat.ISO.DATE;

@RestController
@RequestMapping(path = "/routines", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Routines", description = "Routines des membres (tableaux du matin, du soir…) : gestion et suivi du jour")
public class RoutineController {

    private final RoutineService service;
    private final Clock clock;

    @GetMapping("/modeles")
    @Operation(operationId = "listModelesRoutine", summary = "Modèles de routines prêts à l'emploi (matin, soir)")
    @ApiResponse(responseCode = "200", description = "Modèles, libellés dans la langue demandée")
    public List<RoutineTemplateDTO> templates(
            @Parameter(description = "fr ou nl (fr par défaut)", example = "nl") @RequestParam(defaultValue = "fr") String langue) {
        return service.templates(langue);
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getRoutine", summary = "Détail d'une routine, avec son état du jour")
    @ApiResponse(responseCode = "200", description = "Routine")
    @ApiResponse(responseCode = "404", description = "Routine introuvable", content = @Content)
    public RoutineDTO get(@PathVariable Long id,
                          @Parameter(description = "Jour de l'état (aujourd'hui par défaut)", example = "2026-09-25")
                          @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate date) {
        return service.findById(id, date != null ? date : LocalDate.now(clock));
    }

    @PostMapping
    @Operation(operationId = "createRoutine", summary = "Créer une routine pour un membre")
    @ApiResponse(responseCode = "201", description = "Routine créée (en-tête Location renseigné)")
    @ApiResponse(responseCode = "400", description = "Données invalides (plage horaire incohérente…)", content = @Content)
    @ApiResponse(responseCode = "404", description = "Membre introuvable", content = @Content)
    public ResponseEntity<RoutineDTO> create(@Valid @RequestBody RoutineRequest request) {
        RoutineDTO created = service.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @Operation(operationId = "updateRoutine", summary = "Modifier une routine",
            description = "Les étapes sont remplacées par la liste donnée ; une étape gardée (même id) conserve ses coches du jour.")
    @ApiResponse(responseCode = "200", description = "Routine modifiée")
    @ApiResponse(responseCode = "400", description = "Données invalides", content = @Content)
    @ApiResponse(responseCode = "404", description = "Routine introuvable", content = @Content)
    public RoutineDTO update(@PathVariable Long id, @Valid @RequestBody RoutineRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteRoutine", summary = "Supprimer une routine (et son historique)")
    @ApiResponse(responseCode = "404", description = "Routine introuvable")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @PutMapping("/{id}/etapes/ordre")
    @Operation(operationId = "reorderEtapesRoutine", summary = "Réordonner les étapes",
            description = "Corps : les ids de toutes les étapes de la routine, dans le nouvel ordre.")
    @ApiResponse(responseCode = "200", description = "Routine, étapes dans le nouvel ordre")
    @ApiResponse(responseCode = "400", description = "Liste qui n'est pas exactement les étapes de la routine", content = @Content)
    @ApiResponse(responseCode = "404", description = "Routine introuvable", content = @Content)
    public RoutineDTO reorder(@PathVariable Long id, @RequestBody List<Long> etapeIds) {
        return service.reorder(id, etapeIds);
    }

    @PostMapping("/{id}/runs/{date}/etapes/{stepId}/toggle")
    @Operation(operationId = "toggleEtapeRoutine", summary = "Cocher / décocher une étape de la routine du jour",
            description = "La routine est terminée quand toutes ses étapes sont cochées (calculé par le serveur).")
    @ApiResponse(responseCode = "200", description = "État du jour")
    @ApiResponse(responseCode = "400", description = "Autre jour qu'aujourd'hui", content = @Content)
    @ApiResponse(responseCode = "404", description = "Routine ou étape introuvable", content = @Content)
    public RoutineRunDTO toggle(@PathVariable Long id, @PathVariable @DateTimeFormat(iso = DATE) LocalDate date,
                                @PathVariable Long stepId) {
        return service.toggleStep(id, date, stepId);
    }

    @PostMapping("/{id}/runs/{date}/recompense")
    @Operation(operationId = "jouerRecompenseRoutine", summary = "Marquer la récompense du jour comme jouée",
            description = "Une seule partie par routine terminée et par jour.")
    @ApiResponse(responseCode = "200", description = "État du jour")
    @ApiResponse(responseCode = "400", description = "Autre jour qu'aujourd'hui", content = @Content)
    @ApiResponse(responseCode = "409", description = "Routine pas terminée, ou récompense déjà jouée", content = @Content)
    public RoutineRunDTO reward(@PathVariable Long id, @PathVariable @DateTimeFormat(iso = DATE) LocalDate date) {
        return service.playReward(id, date);
    }
}
