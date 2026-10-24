package com.family.agenda.controller;

import com.family.agenda.dto.AccountCreateRequest;
import com.family.agenda.dto.AccountDTO;
import com.family.agenda.dto.AccountUpdateRequest;
import com.family.agenda.dto.PasswordResetRequest;
import com.family.agenda.security.AccountPrincipal;
import com.family.agenda.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/** Gestion des comptes : parents seulement (pas d'inscription publique). */
@RestController
@RequestMapping(path = "/comptes", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@PreAuthorize("hasRole('PARENT')")
@Tag(name = "Comptes", description = "Comptes de connexion de la famille (parents seulement)")
public class AccountController {

    private final AccountService service;

    @GetMapping
    @Operation(operationId = "listComptes", summary = "Lister les comptes")
    public List<AccountDTO> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getCompte", summary = "Détail d'un compte")
    @ApiResponse(responseCode = "404", description = "Compte introuvable")
    public AccountDTO get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "createCompte", summary = "Créer un compte",
            description = "Avec un mot de passe : actif, à changer à la première connexion. Sans : inactif jusqu'à ce qu'un mot de passe soit défini.")
    @ApiResponse(responseCode = "201", description = "Compte créé")
    @ApiResponse(responseCode = "409", description = "Identifiant déjà utilisé")
    public ResponseEntity<AccountDTO> create(@Valid @RequestBody AccountCreateRequest request) {
        AccountDTO created = service.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "updateCompte", summary = "Modifier un compte (rôle, membre lié, activation)",
            description = "Désactiver un compte ferme ses sessions et révoque « rester connecté ». Il reste toujours au moins un parent actif.")
    public AccountDTO update(@PathVariable Long id, @Valid @RequestBody AccountUpdateRequest request,
                             @AuthenticationPrincipal AccountPrincipal principal) {
        return service.update(id, request, principal == null ? null : principal.id());
    }

    @PostMapping(path = "/{id}/mot-de-passe", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "resetMotDePasseCompte", summary = "Définir un nouveau mot de passe",
            description = "À changer à la prochaine connexion ; sessions et « rester connecté » révoqués ; compte débloqué.")
    public AccountDTO resetPassword(@PathVariable Long id, @Valid @RequestBody PasswordResetRequest request) {
        return service.resetPassword(id, request.motDePasse());
    }
}
