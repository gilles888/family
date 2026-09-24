package com.family.agenda.controller;

import com.family.agenda.dto.ReminderDTO;
import com.family.agenda.dto.ReminderRequest;
import com.family.agenda.dto.ReminderWithAgendaDTO;
import com.family.agenda.service.ReminderService;
import io.swagger.v3.oas.annotations.Operation;
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

@RestController
@RequestMapping(path = "/reminders", version = "1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Reminders", description = "Création/modification des reminders (génère les AgendaEntry)")
public class ReminderController {

    private final ReminderService service;

    @GetMapping
    @Operation(operationId = "listReminders", summary = "Lister les reminders actifs")
    public List<ReminderDTO> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getReminder", summary = "Détail d'un reminder")
    @ApiResponse(responseCode = "404", description = "Reminder introuvable")
    public ReminderDTO get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @Operation(operationId = "createReminder", summary = "Créer un reminder (et générer ses entrées d'agenda)",
            description = """
                    Crée le reminder puis **génère et enregistre immédiatement ses AgendaEntry** :
                    une seule s'il est ponctuel, toutes les occurrences de la fenêtre glissante (6 mois par défaut) \
                    s'il est récurrent. La réponse contient le reminder et un résumé des entrées générées \
                    (nombre, première et dernière date).""")
    @ApiResponse(responseCode = "201", description = "Reminder créé + résumé des AgendaEntry générées")
    @ApiResponse(responseCode = "400", description = "Données invalides (champ manquant, dates incohérentes, membre inconnu...)")
    public ResponseEntity<ReminderWithAgendaDTO> create(@Valid @RequestBody ReminderRequest request) {
        ReminderWithAgendaDTO created = service.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                .buildAndExpand(created.reminder().id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @Operation(operationId = "updateReminder", summary = "Modifier un reminder (régénère ses entrées futures)",
            description = "Les entrées d'agenda **futures** sont réconciliées avec la nouvelle définition ; "
                    + "les entrées passées restent inchangées. Une occurrence future toujours valide conserve son statut.")
    @ApiResponse(responseCode = "404", description = "Reminder introuvable")
    public ReminderWithAgendaDTO update(@PathVariable Long id, @Valid @RequestBody ReminderRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteReminder", summary = "Supprimer un reminder",
            description = "Supprime ses entrées d'agenda futures ; les entrées passées restent inchangées "
                    + "(le reminder est alors archivé et n'apparaît plus dans la liste).")
    @ApiResponse(responseCode = "404", description = "Reminder introuvable")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
