package com.family.agenda.controller;

import com.family.agenda.dto.RecipeDTO;
import com.family.agenda.dto.RecipeRequest;
import com.family.agenda.dto.RecipeSheetDTO;
import com.family.agenda.dto.RecipeSummaryDTO;
import com.family.agenda.service.RecipeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
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
import java.util.List;

@RestController
@RequestMapping(path = "/recettes", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Recettes", description = "Recettes types, partagées par la famille et réutilisables pour planifier les repas")
public class RecipeController {

    private final RecipeService service;

    @GetMapping
    @Operation(operationId = "listRecettes", summary = "Lister les recettes (par ordre alphabétique), avec recherche optionnelle")
    public List<RecipeSummaryDTO> list(
            @Parameter(description = "Ne garder que les recettes dont le nom contient ce texte (sans casse)", example = "spag")
            @RequestParam(required = false) String q) {
        return service.findAll(q);
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getRecette", summary = "Détail d'une recette, avec ses ingrédients")
    @ApiResponse(responseCode = "200", description = "Recette")
    @ApiResponse(responseCode = "404", description = "Recette introuvable", content = @Content)
    public RecipeDTO get(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/fiche")
    @Operation(operationId = "getFicheRecette", summary = "Fiche recette, quantités recalculées pour un nombre de portions",
            description = "Quantités = quantité de la recette × portions ÷ portions de la recette, arrondies à 2 décimales.")
    @ApiResponse(responseCode = "200", description = "Fiche recette")
    @ApiResponse(responseCode = "404", description = "Recette introuvable", content = @Content)
    public RecipeSheetDTO sheet(
            @PathVariable Long id,
            @Parameter(description = "Portions voulues (1 à 100) ; absent = portions de la recette", example = "6")
            @RequestParam(required = false) @Min(1) @Max(100) Integer portions) {
        return service.sheet(id, portions);
    }

    @PostMapping
    @Operation(operationId = "createRecette", summary = "Créer une recette",
            description = "Les ingrédients sont désignés par leur nom : un ingrédient inconnu est créé à la volée.")
    @ApiResponse(responseCode = "201", description = "Recette créée (en-tête Location renseigné)")
    @ApiResponse(responseCode = "400", description = "Données invalides (champ manquant, ingrédient en double...)", content = @Content)
    public ResponseEntity<RecipeDTO> create(@Valid @RequestBody RecipeRequest request) {
        RecipeDTO created = service.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @Operation(operationId = "updateRecette", summary = "Modifier une recette (remplace tous les champs et les ingrédients)")
    @ApiResponse(responseCode = "200", description = "Recette modifiée")
    @ApiResponse(responseCode = "400", description = "Données invalides", content = @Content)
    @ApiResponse(responseCode = "404", description = "Recette introuvable", content = @Content)
    public RecipeDTO update(@PathVariable Long id, @Valid @RequestBody RecipeRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteRecette", summary = "Supprimer une recette",
            description = "Les repas planifiés avec cette recette sont conservés, avec son nom comme libellé libre.")
    @ApiResponse(responseCode = "404", description = "Recette introuvable")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
