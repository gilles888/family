package com.family.agenda.service;

import com.family.agenda.config.AgendaProperties;
import com.family.agenda.dto.AgendaGenerationSummaryDTO;
import com.family.agenda.entity.AgendaEntry;
import com.family.agenda.entity.EntryStatus;
import com.family.agenda.entity.Reminder;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.repository.AgendaEntryRepository;
import com.family.agenda.repository.EntryRange;
import com.family.agenda.repository.ReminderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Génération et gestion des {@link AgendaEntry} persistées.
 * <p>
 * Règle commune à toutes les opérations après création : seules les occurrences <b>à partir de maintenant</b>
 * sont créées ou supprimées ; les entrées passées ne sont jamais modifiées. La génération est idempotente :
 * on compare les occurrences attendues aux dates déjà en base, on n'ajoute que ce qui manque.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgendaService {

    private final AgendaEntryRepository entryRepository;
    private final ReminderRepository reminderRepository;
    private final RecurrenceCalculator calculator;
    private final AgendaProperties properties;
    private final Clock clock;

    /** Génère toutes les entrées d'un reminder tout juste créé (passé éventuel compris). */
    @Transactional
    public AgendaGenerationSummaryDTO generateInitial(Reminder reminder) {
        List<AgendaEntry> entries = expectedOccurrences(reminder).stream()
                .map(dt -> new AgendaEntry(reminder, dt))
                .toList();
        entryRepository.saveAll(entries);
        log.debug("Reminder {} : {} entrée(s) générée(s)", reminder.getId(), entries.size());
        return summarize(reminder.getId());
    }

    /**
     * Après modification d'un reminder : réconcilie les entrées futures avec la nouvelle définition.
     * Les futures qui ne correspondent plus sont supprimées, les manquantes créées ; celles qui subsistent
     * gardent leur statut (une occurrence annulée à la main reste annulée).
     */
    @Transactional
    public AgendaGenerationSummaryDTO regenerateFuture(Reminder reminder) {
        reconcile(reminder, true);
        return summarize(reminder.getId());
    }

    /** Job nocturne : ajoute les occurrences manquantes jusqu'au nouvel horizon, sans rien supprimer. */
    @Transactional
    public int extendHorizon(Long reminderId) {
        Reminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder", reminderId));
        if (!reminder.isActif() || !reminder.isRecurring()) {
            return 0;
        }
        return reconcile(reminder, false);
    }

    /** Suppression d'un reminder : ses entrées futures disparaissent, les passées restent. */
    @Transactional
    public int deleteFutureEntries(Long reminderId) {
        return entryRepository.deleteFutureByReminderId(reminderId, now());
    }

    /** Change le statut d'UNE occurrence, sans toucher aux autres. */
    @Transactional
    public AgendaEntry updateStatus(Long entryId, EntryStatus statut) {
        AgendaEntry entry = entryRepository.findDetailedById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("AgendaEntry", entryId));
        entry.setStatut(statut);
        return entry;
    }

    @Transactional(readOnly = true)
    public AgendaGenerationSummaryDTO summarize(Long reminderId) {
        EntryRange r = entryRepository.summarize(reminderId);
        return new AgendaGenerationSummaryDTO(r.count(), r.first(), r.last());
    }

    /** @return nombre d'entrées ajoutées */
    private int reconcile(Reminder reminder, boolean prune) {
        LocalDateTime from = now();
        List<AgendaEntry> existing = entryRepository.findByReminderIdAndDateHeureGreaterThanEqual(reminder.getId(), from);

        Set<LocalDateTime> expected = new HashSet<>();
        for (LocalDateTime dt : expectedOccurrences(reminder)) {
            if (!dt.isBefore(from)) {
                expected.add(dt);
            }
        }

        Set<LocalDateTime> present = new HashSet<>();
        List<AgendaEntry> obsolete = new ArrayList<>();
        for (AgendaEntry e : existing) {
            present.add(e.getDateHeure());
            if (!expected.contains(e.getDateHeure())) {
                obsolete.add(e);
            }
        }
        if (prune && !obsolete.isEmpty()) {
            entryRepository.deleteAllInBatch(obsolete);
            // Le delete est exécuté avant les insertions ci-dessous : pas de conflit sur la contrainte d'unicité.
            entryRepository.flush();
        }

        List<AgendaEntry> toAdd = expected.stream()
                .filter(dt -> !present.contains(dt))
                .sorted()
                .map(dt -> new AgendaEntry(reminder, dt))
                .toList();
        entryRepository.saveAll(toAdd);
        log.debug("Reminder {} : +{} / -{} entrée(s)", reminder.getId(), toAdd.size(), prune ? obsolete.size() : 0);
        return toAdd.size();
    }

    /** Toutes les occurrences attendues (depuis le début du reminder) jusqu'à l'horizon. */
    private List<LocalDateTime> expectedOccurrences(Reminder reminder) {
        if (!reminder.isRecurring() || reminder.getRecurrenceRule() == null) {
            return List.of(reminder.getDateHeureDebut());
        }
        return calculator.occurrences(reminder.getDateHeureDebut(), reminder.getRecurrenceRule(), horizonEnd(reminder));
    }

    /** Fenêtre glissante : N mois après aujourd'hui (ou après le début si le reminder démarre plus tard). */
    private LocalDate horizonEnd(Reminder reminder) {
        LocalDate base = reminder.getDateHeureDebut().toLocalDate();
        LocalDate today = LocalDate.now(clock);
        return (base.isAfter(today) ? base : today).plusMonths(properties.horizonMonths());
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}
