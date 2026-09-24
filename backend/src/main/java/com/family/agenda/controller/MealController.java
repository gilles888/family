package com.family.agenda.controller;

import com.family.agenda.dto.MealDTO;
import com.family.agenda.dto.MealRequest;
import com.family.agenda.service.MealService;
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
import java.time.LocalDate;
import java.util.List;

import static org.springframework.format.annotation.DateTimeFormat.ISO.DATE;

@RestController
@RequestMapping(path = "/repas", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Repas", description = "Repas planifiés : une recette type ou un libellé libre, un repas par date et créneau")
public class MealController {

    private final MealService service;

    @GetMapping
    @Operation(operationId = "listRepas", summary = "Repas d'une plage de dates",
            description = "Repas dont la date tombe entre `dateDebut` et `dateFin` (jours inclus, 366 jours au plus), par date puis créneau.")
    @ApiResponse(responseCode = "200", description = "Repas de la plage")
    @ApiResponse(responseCode = "400", description = "dateFin antérieure à dateDebut, plage trop longue ou date mal formée",
            content = @Content)
    public List<MealDTO> list(
            @Parameter(description = "Premier jour (ISO, inclus)", example = "2026-09-21", required = true)
            @RequestParam @DateTimeFormat(iso = DATE) LocalDate dateDebut,
            @Parameter(description = "Dernier jour (ISO, inclus)", example = "2026-09-27", required = true)
            @RequestParam @DateTimeFormat(iso = DATE) LocalDate dateFin) {
        return service.findBetween(dateDebut, dateFin);
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getRepas", summary = "Détail d'un repas")
    @ApiResponse(responseCode = "200", description = "Repas")
    @ApiResponse(responseCode = "404", description = "Repas introuvable", content = @Content)
    public MealDTO get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @Operation(operationId = "createRepas", summary = "Planifier un repas")
    @ApiResponse(responseCode = "201", description = "Repas créé (en-tête Location renseigné)")
    @ApiResponse(responseCode = "400", description = "Données invalides : ni recette ni libellé (ou les deux), recette inconnue...",
            content = @Content)
    @ApiResponse(responseCode = "409", description = "Un repas est déjà prévu à cette date et à ce créneau", content = @Content)
    public ResponseEntity<MealDTO> create(@Valid @RequestBody MealRequest request) {
        MealDTO created = service.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @Operation(operationId = "updateRepas", summary = "Modifier un repas")
    @ApiResponse(responseCode = "200", description = "Repas modifié")
    @ApiResponse(responseCode = "400", description = "Données invalides", content = @Content)
    @ApiResponse(responseCode = "404", description = "Repas introuvable", content = @Content)
    @ApiResponse(responseCode = "409", description = "Un autre repas est déjà prévu à cette date et à ce créneau", content = @Content)
    public MealDTO update(@PathVariable Long id, @Valid @RequestBody MealRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteRepas", summary = "Supprimer un repas")
    @ApiResponse(responseCode = "404", description = "Repas introuvable")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
