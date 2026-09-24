package com.family.agenda.controller;

import com.family.agenda.dto.IngredientDTO;
import com.family.agenda.service.IngredientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(path = "/ingredients", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Ingredients", description = "Ingrédients réutilisables (créés à la volée par les recettes)")
public class IngredientController {

    private final IngredientService service;

    @GetMapping
    @Operation(operationId = "searchIngredients", summary = "Rechercher des ingrédients (autocomplétion)",
            description = "Ingrédients dont le nom contient `q`, sans tenir compte de la casse ni des accents, par ordre alphabétique.")
    public List<IngredientDTO> search(
            @Parameter(description = "Texte recherché ; vide = tous", example = "tom") @RequestParam(defaultValue = "") String q,
            @Parameter(description = "Nombre maximal de résultats (1 à 50)", example = "10")
            @RequestParam(defaultValue = "10") @Min(1) @Max(IngredientService.LIMITE_MAX) int limit) {
        return service.search(q, limit);
    }
}
