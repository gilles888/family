package com.family.agenda.controller;

import com.family.agenda.dto.StarBalanceDTO;
import com.family.agenda.dto.StarPenaltyDTO;
import com.family.agenda.dto.StarPenaltyRequest;
import com.family.agenda.security.AccountPrincipal;
import com.family.agenda.service.StarPenaltyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(path = "/membres/{memberId}/etoiles", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Etoiles", description = "Étoiles retirées aux membres")
public class StarPenaltyController {

    private final StarPenaltyService service;

    @PreAuthorize("@memberAccess.member(#memberId)")
    @GetMapping
    @Operation(operationId = "getSoldeEtoiles", summary = "Solde d'étoiles depuis le début : gagnées, retirées, total")
    @ApiResponse(responseCode = "200", description = "Solde")
    @ApiResponse(responseCode = "404", description = "Membre introuvable", content = @Content)
    public StarBalanceDTO balance(@PathVariable Long memberId) {
        return service.balance(memberId);
    }

    @PreAuthorize("@memberAccess.member(#memberId)")
    @GetMapping("/retraits")
    @Operation(operationId = "listRetraitsEtoiles", summary = "Étoiles retirées à un membre (les plus récentes d'abord)")
    @ApiResponse(responseCode = "200", description = "Retraits")
    @ApiResponse(responseCode = "404", description = "Membre introuvable", content = @Content)
    public List<StarPenaltyDTO> list(@PathVariable Long memberId) {
        return service.findForMember(memberId);
    }

    @PostMapping("/retraits")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "retirerEtoiles", summary = "Retirer des étoiles à un membre, avec un motif (parent)",
            description = "Le commentaire est obligatoire pour le motif AUTRE.")
    @ApiResponse(responseCode = "201", description = "Retrait enregistré")
    @ApiResponse(responseCode = "400", description = "Nombre ou motif invalide, commentaire manquant, jour à venir", content = @Content)
    @ApiResponse(responseCode = "404", description = "Membre introuvable", content = @Content)
    public StarPenaltyDTO create(@PathVariable Long memberId, @Valid @RequestBody StarPenaltyRequest request,
                                 Authentication authentication) {
        Long accountId = authentication != null && authentication.getPrincipal() instanceof AccountPrincipal p ? p.id() : null;
        return service.create(memberId, request, accountId);
    }

    @DeleteMapping("/retraits/{penaltyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "annulerRetraitEtoiles", summary = "Annuler un retrait d'étoiles (parent) : les étoiles sont rendues")
    @ApiResponse(responseCode = "404", description = "Membre ou retrait introuvable", content = @Content)
    public void delete(@PathVariable Long memberId, @PathVariable Long penaltyId) {
        service.delete(memberId, penaltyId);
    }
}
