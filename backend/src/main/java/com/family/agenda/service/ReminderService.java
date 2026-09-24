package com.family.agenda.service;

import com.family.agenda.dto.AgendaGenerationSummaryDTO;
import com.family.agenda.dto.ReminderDTO;
import com.family.agenda.dto.ReminderRequest;
import com.family.agenda.dto.ReminderWithAgendaDTO;
import com.family.agenda.entity.FamilyMember;
import com.family.agenda.entity.Reminder;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.mapper.RecurrenceRuleMapper;
import com.family.agenda.mapper.ReminderMapper;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.ReminderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
@Transactional
public class ReminderService {

    private final ReminderRepository repository;
    private final FamilyMemberRepository memberRepository;
    private final AgendaService agendaService;
    private final ReminderMapper mapper;
    private final RecurrenceRuleMapper ruleMapper;

    @Transactional(readOnly = true)
    public List<ReminderDTO> findAll() {
        return repository.findByActifTrueOrderByDateHeureDebutAscIdAsc().stream().map(mapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public ReminderDTO findById(Long id) {
        return mapper.toDto(loadActive(id));
    }

    /** Crée le reminder ET génère immédiatement ses AgendaEntry (une, ou toute la fenêtre si récurrent). */
    public ReminderWithAgendaDTO create(ReminderRequest request) {
        Reminder reminder = mapper.toEntity(request);
        reminder.setMembres(resolveMembers(request.membreIds()));
        applyRecurrence(reminder, request);
        repository.save(reminder);

        AgendaGenerationSummaryDTO summary = agendaService.generateInitial(reminder);
        return new ReminderWithAgendaDTO(mapper.toDto(reminder), summary);
    }

    /** Modifie le reminder et régénère ses AgendaEntry futures ; les entrées passées restent inchangées. */
    public ReminderWithAgendaDTO update(Long id, ReminderRequest request) {
        Reminder reminder = loadActive(id);
        mapper.update(request, reminder);
        reminder.setMembres(resolveMembers(request.membreIds()));
        applyRecurrence(reminder, request);
        repository.saveAndFlush(reminder);

        AgendaGenerationSummaryDTO summary = agendaService.regenerateFuture(reminder);
        return new ReminderWithAgendaDTO(mapper.toDto(reminder), summary);
    }

    /**
     * Supprime les AgendaEntry futures. Si des entrées passées existent, le reminder est archivé (elles
     * restent inchangées et gardent leur titre) ; sinon il est réellement supprimé.
     */
    public void delete(Long id) {
        Reminder reminder = loadActive(id);
        agendaService.deleteFutureEntries(id);
        if (agendaService.summarize(id).nombre() == 0) {
            repository.delete(reminder);
        } else {
            reminder.setActif(false);
        }
    }

    private void applyRecurrence(Reminder reminder, ReminderRequest request) {
        if (!request.recurring()) {
            reminder.setRecurrenceRule(null); // orphanRemoval supprime l'ancienne règle
        } else if (reminder.getRecurrenceRule() == null) {
            reminder.setRecurrenceRule(ruleMapper.toEntity(request.recurrence()));
        } else {
            ruleMapper.update(request.recurrence(), reminder.getRecurrenceRule());
        }
    }

    private Set<FamilyMember> resolveMembers(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return new LinkedHashSet<>();
        }
        List<FamilyMember> found = memberRepository.findAllById(ids);
        if (found.size() != ids.size()) {
            Set<Long> missing = new TreeSet<>(ids);
            found.forEach(m -> missing.remove(m.getId()));
            throw new BusinessRuleException("Membre(s) introuvable(s) : " + missing);
        }
        return new LinkedHashSet<>(found);
    }

    private Reminder loadActive(Long id) {
        return repository.findByIdAndActifTrue(id).orElseThrow(() -> new ResourceNotFoundException("Reminder", id));
    }
}
