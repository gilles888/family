package com.family.agenda.scheduler;

import com.family.agenda.repository.ReminderRepository;
import com.family.agenda.service.AgendaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

/**
 * Job nocturne : prolonge la génération des AgendaEntry des reminders récurrents actifs pour que l'agenda ne
 * manque jamais d'occurrences. Un reminder en échec n'empêche pas le traitement des autres (transaction par
 * reminder, portée par AgendaService).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AgendaExtensionScheduler {

    private final ReminderRepository reminderRepository;
    private final AgendaService agendaService;
    private final Clock clock;

    @Scheduled(cron = "${agenda.generation.cron:0 0 2 * * *}")
    public void extendRecurringEntries() {
        run();
    }

    /** Logique du job, exposée séparément pour pouvoir être appelée dans les tests. */
    public int run() {
        List<Long> ids = reminderRepository.findIdsOfActiveRecurring(LocalDate.now(clock));
        int added = 0;
        for (Long id : ids) {
            try {
                added += agendaService.extendHorizon(id);
            } catch (RuntimeException ex) {
                log.error("Prolongation de l'agenda impossible pour le reminder {}", id, ex);
            }
        }
        log.info("Prolongation de l'agenda : {} reminder(s) récurrent(s) traité(s), {} entrée(s) ajoutée(s)",
                ids.size(), added);
        return added;
    }
}
