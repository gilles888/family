package com.family.agenda.controller;

import com.family.agenda.dto.PantryItemDTO;
import com.family.agenda.dto.PantryItemRequest;
import com.family.agenda.service.PantryService;
import com.family.agenda.service.PantryService.AddResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping(path = "/garde-manger", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "GardeManger", description = "Ce qu'on a toujours à la maison : marqué « déjà à la maison » dans la liste de courses")
public class PantryController {

    private final PantryService service;

    @GetMapping
    @Operation(operationId = "listGardeManger", summary = "Articles du garde-manger, par ordre alphabétique")
    @ApiResponse(responseCode = "200", description = "Garde-manger")
    public List<PantryItemDTO> list() {
        return service.findAll();
    }

    @PostMapping
    @Operation(operationId = "addGardeManger", summary = "Ajouter au garde-manger",
            description = "Marque aussi « déjà à la maison » les lignes de même nom dans la liste de courses. "
                    + "Un nom déjà présent (sans tenir compte de la casse ni des accents) n'est pas ajouté deux fois.")
    @ApiResponse(responseCode = "201", description = "Ajouté (en-tête Location renseigné)")
    @ApiResponse(responseCode = "200", description = "Déjà au garde-manger")
    @ApiResponse(responseCode = "400", description = "Nom manquant ou trop long", content = @Content)
    public ResponseEntity<PantryItemDTO> add(@Valid @RequestBody PantryItemRequest request) {
        AddResult result = service.add(request.nom());
        if (!result.created()) {
            return ResponseEntity.ok(result.item());
        }
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(result.item().id()).toUri();
        return ResponseEntity.created(location).body(result.item());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteGardeManger", summary = "Retirer du garde-manger")
    @ApiResponse(responseCode = "404", description = "Article introuvable")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
