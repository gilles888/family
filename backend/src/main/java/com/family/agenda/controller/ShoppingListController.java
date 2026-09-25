package com.family.agenda.controller;

import com.family.agenda.dto.ShoppingItemDTO;
import com.family.agenda.dto.ShoppingItemRequest;
import com.family.agenda.dto.ShoppingItemStatusRequest;
import com.family.agenda.dto.ShoppingListDTO;
import com.family.agenda.dto.ShoppingListGenerateRequest;
import com.family.agenda.service.ShoppingListService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping(path = "/courses", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Courses", description = "Liste de courses : générée depuis les repas planifiés, complétée à la main")
public class ShoppingListController {

    private final ShoppingListService service;

    @GetMapping
    @Operation(operationId = "getCourses", summary = "Liste de courses",
            description = "Articles non retirés, par ordre alphabétique, et période de la dernière génération.")
    @ApiResponse(responseCode = "200", description = "Liste de courses")
    public ShoppingListDTO get() {
        return service.get();
    }

    @PostMapping("/generer")
    @Operation(operationId = "genererCourses", summary = "Générer ou régénérer la liste depuis les repas d'une période",
            description = """
                    Additionne les ingrédients des repas de la période (portions au prorata ; g/kg et ml/l convertis ; \
                    unités incompatibles sur des lignes séparées). Régénérer met à jour les lignes générées et garde \
                    les articles manuels et les statuts (acheté, déjà à la maison). Les ingrédients du garde-manger \
                    arrivent « déjà à la maison ».""")
    @ApiResponse(responseCode = "200", description = "Liste mise à jour")
    @ApiResponse(responseCode = "400", description = "dateFin antérieure à dateDebut ou période de plus de 62 jours",
            content = @Content)
    public ShoppingListDTO generate(@Valid @RequestBody ShoppingListGenerateRequest request) {
        return service.generate(request.dateDebut(), request.dateFin());
    }

    @PostMapping("/articles")
    @Operation(operationId = "createArticle", summary = "Ajouter un article à la main")
    @ApiResponse(responseCode = "201", description = "Article ajouté (en-tête Location renseigné)")
    @ApiResponse(responseCode = "400", description = "Données invalides (unité sans quantité…)", content = @Content)
    public ResponseEntity<ShoppingItemDTO> create(@Valid @RequestBody ShoppingItemRequest request) {
        ShoppingItemDTO created = service.addManual(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/articles/{id}")
    @Operation(operationId = "updateArticle", summary = "Modifier un article",
            description = "Une ligne générée modifiée garde ensuite son nom, sa quantité et son unité aux régénérations.")
    @ApiResponse(responseCode = "200", description = "Article modifié")
    @ApiResponse(responseCode = "400", description = "Données invalides", content = @Content)
    @ApiResponse(responseCode = "404", description = "Article introuvable", content = @Content)
    public ShoppingItemDTO update(@PathVariable Long id, @Valid @RequestBody ShoppingItemRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/articles/{id}")
    @Operation(operationId = "updateArticleStatut", summary = "Cocher / décocher « acheté » ou « déjà à la maison »")
    @ApiResponse(responseCode = "200", description = "Article modifié")
    @ApiResponse(responseCode = "400", description = "Aucun statut indiqué", content = @Content)
    @ApiResponse(responseCode = "404", description = "Article introuvable", content = @Content)
    public ShoppingItemDTO updateStatus(@PathVariable Long id, @RequestBody ShoppingItemStatusRequest request) {
        return service.updateStatus(id, request);
    }

    @DeleteMapping("/articles/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteArticle", summary = "Supprimer un article",
            description = "Une ligne générée est retirée : elle ne revient pas à la régénération tant qu'un repas en a besoin.")
    @ApiResponse(responseCode = "404", description = "Article introuvable")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @DeleteMapping("/articles/achetes")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "viderArticlesAchetes", summary = "Vider les articles achetés",
            description = "Retire de la liste tous les articles cochés « acheté ».")
    public void clearBought() {
        service.clearBought();
    }
}
