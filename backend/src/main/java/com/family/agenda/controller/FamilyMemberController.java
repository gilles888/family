package com.family.agenda.controller;

import com.family.agenda.dto.FamilyMemberDTO;
import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.service.FamilyMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(path = "/membres", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Membres", description = "Membres de la famille")
public class FamilyMemberController {

    private final FamilyMemberService service;

    @GetMapping
    @Operation(operationId = "listMembres", summary = "Lister les membres de la famille (par ordre alphabétique)")
    public List<FamilyMemberDTO> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getMembre", summary = "Détail d'un membre")
    @ApiResponse(responseCode = "404", description = "Membre introuvable")
    public FamilyMemberDTO get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @Operation(operationId = "createMembre", summary = "Créer un membre")
    @ApiResponse(responseCode = "201", description = "Membre créé (en-tête Location renseigné)")
    public ResponseEntity<FamilyMemberDTO> create(@Valid @RequestBody FamilyMemberRequest request) {
        FamilyMemberDTO created = service.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @Operation(operationId = "updateMembre", summary = "Modifier un membre")
    @ApiResponse(responseCode = "404", description = "Membre introuvable")
    public FamilyMemberDTO update(@PathVariable Long id, @Valid @RequestBody FamilyMemberRequest request) {
        return service.update(id, request);
    }

    @PutMapping(path = "/{id}/avatar", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "updateAvatarMembre", summary = "Enregistrer le personnage (avatar) d'un membre",
            description = """
                    Corps : un objet JSON libre (pièces du catalogue front, couleurs, `version` du catalogue), \
                    2000 caractères au plus une fois sérialisé. `null` revient à l'avatar par défaut.""")
    @ApiResponse(responseCode = "200", description = "Membre, avec son avatar")
    @ApiResponse(responseCode = "400", description = "Corps qui n'est pas un objet JSON, ou trop long", content = @Content)
    @ApiResponse(responseCode = "404", description = "Membre introuvable", content = @Content)
    public FamilyMemberDTO updateAvatar(@PathVariable Long id,
                                        @RequestBody(required = false) Map<String, Object> avatarConfig) {
        return service.updateAvatar(id, avatarConfig);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteMembre", summary = "Supprimer un membre",
            description = "Le membre est retiré des reminders auxquels il participait ; ceux-ci et leurs entrées d'agenda sont conservés.")
    @ApiResponse(responseCode = "404", description = "Membre introuvable")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
