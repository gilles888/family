package com.family.agenda.controller;

import com.family.agenda.dto.TenueAutoRequest;
import com.family.agenda.entity.Saison;
import com.family.agenda.service.OutfitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping(path = "/membres/{memberId}/tenues", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Tenues", description = "Tenues de thème des personnages")
public class OutfitController {

    private final OutfitService service;

    @PreAuthorize("@memberAccess.member(#memberId)")
    @GetMapping
    @Operation(operationId = "listTenues", summary = "Tenues de thème d'un membre : config du personnage par thème")
    public Map<String, Map<String, Object>> list(@PathVariable Long memberId) {
        return service.findForMember(memberId);
    }

    @PreAuthorize("@memberAccess.member(#memberId)")
    @PutMapping("/{theme}")
    @Operation(operationId = "updateTenue", summary = "Enregistrer la tenue d'un thème",
            description = "Corps : config du personnage (objet JSON). Refusée (400) si elle contient un article payant non possédé.")
    @ApiResponse(responseCode = "400", description = "Config invalide, trop longue, ou article non possédé", content = @Content)
    public Map<String, Map<String, Object>> save(@PathVariable Long memberId, @PathVariable Saison theme, @RequestBody Map<String, Object> config) {
        return service.save(memberId, theme, config);
    }

    @PreAuthorize("@memberAccess.member(#memberId)")
    @DeleteMapping("/{theme}")
    @Operation(operationId = "deleteTenue", summary = "Supprimer la tenue d'un thème")
    public Map<String, Map<String, Object>> delete(@PathVariable Long memberId, @PathVariable Saison theme) {
        return service.delete(memberId, theme);
    }

    @PreAuthorize("@memberAccess.member(#memberId)")
    @PutMapping("/auto")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "updateTenueAuto", summary = "Porter automatiquement la tenue du thème du moment, ou non")
    public void setAuto(@PathVariable Long memberId, @RequestBody TenueAutoRequest request) {
        service.setAuto(memberId, request.actif());
    }
}
