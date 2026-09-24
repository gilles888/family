package com.family.agenda.service;

import com.family.agenda.dto.AgendaEntryDTO;
import com.family.agenda.dto.MonthSummaryDTO;
import com.family.agenda.dto.YearSummaryDTO;
import com.family.agenda.entity.AgendaEntry;
import com.family.agenda.entity.ReminderType;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.mapper.AgendaEntryMapper;
import com.family.agenda.repository.AgendaEntryRepository;
import com.family.agenda.repository.MonthTypeCount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Lecture de l'agenda : plage, jour, mois, année. Toutes les vues acceptent un filtre optionnel par membre. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgendaQueryService {

    private final AgendaEntryRepository repository;
    private final AgendaEntryMapper mapper;

    /** Entrées dont la date tombe entre {@code debut} et {@code fin}, jours inclus, ordre chronologique. */
    public List<AgendaEntryDTO> findBetween(LocalDate debut, LocalDate fin, Long membreId) {
        if (fin.isBefore(debut)) {
            throw new BusinessRuleException("dateFin doit être postérieure ou égale à dateDebut");
        }
        return mapper.toDtos(entries(debut.atStartOfDay(), fin.plusDays(1).atStartOfDay(), membreId));
    }

    public List<AgendaEntryDTO> findDay(LocalDate jour, Long membreId) {
        return findBetween(jour, jour, membreId);
    }

    /** Entrées de la semaine (lundi à dimanche) qui contient {@code jour}, ordre chronologique. */
    public List<AgendaEntryDTO> findWeek(LocalDate jour, Long membreId) {
        LocalDate lundi = jour.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return findBetween(lundi, lundi.plusDays(6), membreId);
    }

    /** Entrées du mois groupées par jour (seuls les jours ayant au moins une entrée sont présents). */
    public Map<LocalDate, List<AgendaEntryDTO>> findMonth(int annee, int mois, Long membreId) {
        if (mois < 1 || mois > 12) {
            throw new BusinessRuleException("mois doit être compris entre 1 et 12");
        }
        YearMonth ym = YearMonth.of(annee, mois);
        List<AgendaEntry> entries = entries(ym.atDay(1).atStartOfDay(), ym.plusMonths(1).atDay(1).atStartOfDay(), membreId);

        Map<LocalDate, List<AgendaEntryDTO>> byDay = new TreeMap<>();
        for (AgendaEntry e : entries) {
            byDay.computeIfAbsent(e.getDateHeure().toLocalDate(), d -> new ArrayList<>()).add(mapper.toDto(e));
        }
        return byDay;
    }

    /** Vue annuelle : pour chacun des 12 mois, nombre d'entrées au total et par type. */
    public YearSummaryDTO summarizeYear(int annee, Long membreId) {
        LocalDateTime debut = Year.of(annee).atDay(1).atStartOfDay();
        LocalDateTime fin = debut.plusYears(1);
        List<MonthTypeCount> rows = membreId == null
                ? repository.countByMonthAndType(debut, fin)
                : repository.countByMonthAndTypeForMember(debut, fin, membreId);

        List<Map<ReminderType, Long>> perMonth = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            perMonth.add(new EnumMap<>(ReminderType.class));
        }
        rows.forEach(r -> perMonth.get(r.month() - 1).merge(r.type(), r.count(), Long::sum));

        List<MonthSummaryDTO> months = new ArrayList<>();
        long total = 0;
        for (int i = 0; i < 12; i++) {
            Map<ReminderType, Long> byType = perMonth.get(i);
            long monthTotal = byType.values().stream().mapToLong(Long::longValue).sum();
            total += monthTotal;
            months.add(new MonthSummaryDTO(i + 1, monthTotal, byType));
        }
        return new YearSummaryDTO(annee, total, months);
    }

    private List<AgendaEntry> entries(LocalDateTime debut, LocalDateTime fin, Long membreId) {
        return membreId == null
                ? repository.findInRange(debut, fin)
                : repository.findInRangeForMember(debut, fin, membreId);
    }
}
