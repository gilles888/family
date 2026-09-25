package com.family.agenda.controller;

import com.family.agenda.dto.RoutineDTO;
import com.family.agenda.dto.RoutineFromTemplateRequest;
import com.family.agenda.dto.RoutineHistoryDTO;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import static org.springframework.format.annotation.DateTimeFormat.ISO.DATE;

@RestController
@RequestMapping(path = "/membres/{memberId}/routines", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Routines")
public class MemberRoutineController {

    private final RoutineService service;
    private final Clock clock;

    @GetMapping
    @Operation(operationId = "listRoutinesMembre", summary = "Routines d'un membre, avec leur état pour un jour",
            description = "Toutes les routines (actives ou non), dans l'ordre. L'écran enfant garde les actives du jour.")
    @ApiResponse(responseCode = "200", description = "Routines")
    @ApiResponse(responseCode = "404", description = "Membre introuvable", content = @Content)
    public List<RoutineDTO> list(@PathVariable Long memberId,
                                 @Parameter(description = "Jour de l'état (aujourd'hui par défaut)", example = "2026-09-25")
                                 @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate date) {
        return service.findForMember(memberId, date != null ? date : LocalDate.now(clock));
    }

    @PostMapping("/modele")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "appliquerModeleRoutine", summary = "Copier un modèle de routine chez le membre (copie modifiable)")
    @ApiResponse(responseCode = "201", description = "Routine créée")
    @ApiResponse(responseCode = "400", description = "Modèle ou langue inconnus", content = @Content)
    @ApiResponse(responseCode = "404", description = "Membre introuvable", content = @Content)
    public RoutineDTO applyTemplate(@PathVariable Long memberId, @Valid @RequestBody RoutineFromTemplateRequest request) {
        return service.applyTemplate(memberId, request.modele(), request.langue());
    }

    @GetMapping("/historique")
    @Operation(operationId = "historiqueRoutinesMembre", summary = "Routines terminées sur les derniers jours",
            description = "Un élément par jour, du plus ancien à aujourd'hui (14 jours par défaut, 62 au plus).")
    @ApiResponse(responseCode = "200", description = "Historique")
    @ApiResponse(responseCode = "404", description = "Membre introuvable", content = @Content)
    public List<RoutineHistoryDTO> history(@PathVariable Long memberId,
                                           @Parameter(example = "14") @RequestParam(defaultValue = "14") int jours) {
        return service.history(memberId, jours);
    }
}
