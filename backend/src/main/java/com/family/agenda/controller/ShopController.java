package com.family.agenda.controller;

import com.family.agenda.dto.AchatRequest;
import com.family.agenda.dto.AjustementRequest;
import com.family.agenda.dto.ArticleDTO;
import com.family.agenda.dto.BoutiqueSettingsDTO;
import com.family.agenda.dto.CoinTransactionDTO;
import com.family.agenda.dto.EchangeRequest;
import com.family.agenda.dto.MemberItemDTO;
import com.family.agenda.dto.PorteMonnaieDTO;
import com.family.agenda.dto.RemboursementRequest;
import com.family.agenda.security.AccountPrincipal;
import com.family.agenda.service.ShopService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Boutique : catalogue, porte-monnaie, échange d'étoiles, achats. Un enfant agit seulement pour son propre membre
 * ({@code memberAccess}) ; cadeau, remboursement, ajustement et réglage du taux sont réservés aux parents.
 */
@RestController
@RequestMapping(path = "/", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Boutique", description = "Étoiles, pièces d'or et articles du personnage")
public class ShopController {

    private final ShopService service;

    @GetMapping("/boutique/catalogue")
    @Operation(operationId = "getCatalogueBoutique", summary = "Catalogue : tous les articles, avec leur prix en pièces (0 = gratuit)")
    public List<ArticleDTO> catalogue() {
        return service.catalogue();
    }

    @PreAuthorize("@memberAccess.member(#memberId)")
    @GetMapping("/membres/{memberId}/porte-monnaie")
    @Operation(operationId = "getPorteMonnaie", summary = "Étoiles disponibles, pièces d'or et taux de change d'un membre")
    @ApiResponse(responseCode = "200", description = "Porte-monnaie")
    @ApiResponse(responseCode = "404", description = "Membre introuvable", content = @Content)
    public PorteMonnaieDTO wallet(@PathVariable Long memberId) {
        return service.porteMonnaie(memberId);
    }

    @PreAuthorize("@memberAccess.member(#memberId)")
    @PostMapping("/membres/{memberId}/porte-monnaie/echange")
    @Operation(operationId = "echangerEtoiles", summary = "Échanger des étoiles contre des pièces d'or",
            description = "Chaque pièce coûte « étoiles par pièce » étoiles disponibles.")
    @ApiResponse(responseCode = "200", description = "Porte-monnaie après l'échange")
    @ApiResponse(responseCode = "400", description = "Pas assez d'étoiles", content = @Content)
    public PorteMonnaieDTO exchange(@PathVariable Long memberId, @Valid @RequestBody EchangeRequest request, Authentication authentication) {
        return service.exchange(memberId, request.pieces(), accountId(authentication));
    }

    @PostMapping("/membres/{memberId}/porte-monnaie/ajustements")
    @Operation(operationId = "ajusterPieces", summary = "Ajouter ou retirer des pièces, avec un motif (parent)")
    @ApiResponse(responseCode = "200", description = "Porte-monnaie après l'ajustement")
    @ApiResponse(responseCode = "400", description = "Ajustement nul, motif manquant ou solde de pièces qui deviendrait négatif", content = @Content)
    public PorteMonnaieDTO adjust(@PathVariable Long memberId, @Valid @RequestBody AjustementRequest request, Authentication authentication) {
        return service.adjust(memberId, request.pieces(), request.commentaire(), accountId(authentication));
    }

    @PreAuthorize("@memberAccess.member(#memberId)")
    @GetMapping("/membres/{memberId}/articles")
    @Operation(operationId = "listArticlesPossedes", summary = "Articles payants possédés par un membre (les gratuits le sont d'office)")
    public List<MemberItemDTO> items(@PathVariable Long memberId) {
        return service.articles(memberId);
    }

    @PreAuthorize("@memberAccess.member(#memberId)")
    @GetMapping("/membres/{memberId}/transactions")
    @Operation(operationId = "listTransactionsPieces", summary = "Mouvements de pièces d'un membre (les plus récents d'abord)")
    public List<CoinTransactionDTO> transactions(@PathVariable Long memberId) {
        return service.transactions(memberId);
    }

    @PreAuthorize("@memberAccess.member(#memberId)")
    @PostMapping("/membres/{memberId}/boutique/achats")
    @Operation(operationId = "acheterArticle", summary = "Acheter un article avec des pièces d'or")
    @ApiResponse(responseCode = "200", description = "Porte-monnaie après l'achat")
    @ApiResponse(responseCode = "400", description = "Pas assez de pièces, ou article gratuit", content = @Content)
    @ApiResponse(responseCode = "404", description = "Membre ou article introuvable", content = @Content)
    @ApiResponse(responseCode = "409", description = "Article déjà possédé", content = @Content)
    public PorteMonnaieDTO buy(@PathVariable Long memberId, @Valid @RequestBody AchatRequest request, Authentication authentication) {
        return service.buy(memberId, request.articleId(), accountId(authentication));
    }

    @PostMapping("/membres/{memberId}/boutique/cadeaux")
    @Operation(operationId = "offrirArticle", summary = "Offrir un article sans payer (parent)")
    @ApiResponse(responseCode = "200", description = "Porte-monnaie après le cadeau")
    @ApiResponse(responseCode = "409", description = "Article déjà possédé", content = @Content)
    public PorteMonnaieDTO gift(@PathVariable Long memberId, @Valid @RequestBody AchatRequest request, Authentication authentication) {
        return service.gift(memberId, request.articleId(), accountId(authentication));
    }

    @PostMapping("/membres/{memberId}/boutique/remboursements")
    @Operation(operationId = "rembourserArticle", summary = "Rembourser un article (parent)",
            description = "L'article est retiré et les pièces payées sont rendues. S'il était porté, le personnage revient à la pièce par défaut de l'emplacement.")
    @ApiResponse(responseCode = "200", description = "Porte-monnaie après le remboursement")
    @ApiResponse(responseCode = "404", description = "Article non possédé", content = @Content)
    public PorteMonnaieDTO refund(@PathVariable Long memberId, @Valid @RequestBody RemboursementRequest request, Authentication authentication) {
        return service.refund(memberId, request.articleId(), request.commentaire(), accountId(authentication));
    }

    @GetMapping("/parametres/boutique")
    @Operation(operationId = "getReglageBoutique", summary = "Réglages de la boutique (parent)")
    public BoutiqueSettingsDTO settings() {
        return new BoutiqueSettingsDTO(service.etoilesParPiece());
    }

    @PutMapping("/parametres/boutique")
    @ResponseStatus(HttpStatus.OK)
    @Operation(operationId = "updateReglageBoutique", summary = "Modifier le taux de change étoiles → pièces (parent)",
            description = "Ne change pas les échanges déjà faits.")
    public BoutiqueSettingsDTO updateSettings(@Valid @RequestBody BoutiqueSettingsDTO request, Authentication authentication) {
        return new BoutiqueSettingsDTO(service.updateEtoilesParPiece(request.etoilesParPiece(), accountId(authentication)));
    }

    private static Long accountId(Authentication authentication) {
        return authentication != null && authentication.getPrincipal() instanceof AccountPrincipal p ? p.id() : null;
    }
}
