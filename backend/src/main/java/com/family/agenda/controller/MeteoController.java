package com.family.agenda.controller;

import com.family.agenda.dto.MeteoDTO;
import com.family.agenda.service.MeteoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/meteo", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Meteo", description = "Météo du jour et du lendemain, et tenue conseillée pour les enfants")
public class MeteoController {

    private final MeteoService service;

    @GetMapping
    @Operation(operationId = "getMeteo", summary = "Météo d'aujourd'hui et de demain, avec la tenue conseillée",
            description = "Source : Open-Meteo, gardée en cache. Si Open-Meteo ne répond pas, la dernière prévision du jour est resservie.")
    @ApiResponse(responseCode = "200", description = "Prévisions et tenues d'aujourd'hui et de demain")
    @ApiResponse(responseCode = "503", description = "Open-Meteo injoignable et aucune prévision du jour en cache",
            content = @Content)
    public MeteoDTO get() {
        return service.getMeteo();
    }
}
