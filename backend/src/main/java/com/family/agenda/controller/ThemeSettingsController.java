package com.family.agenda.controller;

import com.family.agenda.dto.ThemeSettingsDTO;
import com.family.agenda.dto.ThemeSettingsRequest;
import com.family.agenda.security.AccountPrincipal;
import com.family.agenda.service.ThemeSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/parametres/theme", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Parametres", description = "Réglages de la famille")
public class ThemeSettingsController {

    private final ThemeSettingsService service;

    @GetMapping
    @Operation(operationId = "getThemeFamille", summary = "Thème de l'application pour la famille",
            description = "Un thème forcé dont la date de fin est dépassée est remis en AUTO.")
    public ThemeSettingsDTO get() {
        return service.get();
    }

    @PutMapping
    @Operation(operationId = "updateThemeFamille", summary = "Modifier le thème de la famille (parent)")
    @ApiResponse(responseCode = "400", description = "Mode FORCE sans thème, ANNIVERSAIRE sans membre, fin dans le passé", content = @Content)
    public ThemeSettingsDTO update(@Valid @RequestBody ThemeSettingsRequest request, Authentication authentication) {
        Long accountId = authentication != null && authentication.getPrincipal() instanceof AccountPrincipal p ? p.id() : null;
        return service.update(request, accountId);
    }
}
