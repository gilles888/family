package com.family.agenda.config;

import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.dto.RecurrenceRuleRequest;
import com.family.agenda.dto.ReminderRequest;
import com.family.agenda.dto.ReminderWithAgendaDTO;
import com.family.agenda.entity.RecurrenceFrequency;
import com.family.agenda.entity.ReminderType;
import com.family.agenda.service.FamilyMemberService;
import com.family.agenda.service.ReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Set;

/**
 * Données de test (profil dev, {@code agenda.seed.enabled=true}). Elles passent par les services métier :
 * les AgendaEntry sont donc générées exactement comme lors d'un vrai POST /v1/reminders. Les dates sont
 * relatives à aujourd'hui pour que l'agenda ne soit jamais vide.
 */
@Component
@ConditionalOnProperty(name = "agenda.seed.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final FamilyMemberService memberService;
    private final ReminderService reminderService;
    private final Clock clock;

    @Override
    public void run(String... args) {
        if (!memberService.findAll().isEmpty()) {
            log.info("Données de test ignorées : la base contient déjà des membres");
            return;
        }
        LocalDate today = LocalDate.now(clock);

        Long maman = memberService.create(new FamilyMemberRequest("Maman", "#E91E63")).id();
        Long papa = memberService.create(new FamilyMemberRequest("Papa", "#2196F3")).id();
        Long lea = memberService.create(new FamilyMemberRequest("Léa", "#FF9800")).id();
        Long tom = memberService.create(new FamilyMemberRequest("Tom", "#4CAF50")).id();

        // Sport récurrent hebdo, sans fin : Léa, natation tous les mercredis
        report(reminderService.create(new ReminderRequest("Natation", "Piscine municipale", ReminderType.SPORT,
                at(next(today, DayOfWeek.WEDNESDAY), 17, 30), at(next(today, DayOfWeek.WEDNESDAY), 18, 30),
                Set.of(lea), true,
                new RecurrenceRuleRequest(RecurrenceFrequency.WEEKLY, 1, Set.of(DayOfWeek.WEDNESDAY), null, null))));

        // Sport récurrent hebdo sur 2 jours, avec date de fin : Tom et Papa, football mardi + jeudi
        report(reminderService.create(new ReminderRequest("Football", "Entraînement au stade", ReminderType.SPORT,
                at(next(today, DayOfWeek.TUESDAY), 18, 0), at(next(today, DayOfWeek.TUESDAY), 19, 30),
                Set.of(tom, papa), true,
                new RecurrenceRuleRequest(RecurrenceFrequency.WEEKLY, 1, Set.of(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY),
                        today.plusMonths(4), null))));

        // Test médical ponctuel
        report(reminderService.create(new ReminderRequest("Prise de sang", "À jeun, laboratoire du centre-ville",
                ReminderType.TEST_MEDICAL, at(today.plusDays(10), 8, 30), null,
                Set.of(maman), false, null)));

        // Rendez-vous ponctuel
        report(reminderService.create(new ReminderRequest("Dentiste", "Contrôle annuel", ReminderType.RENDEZ_VOUS,
                at(today.plusDays(3), 16, 0), at(today.plusDays(3), 16, 45),
                Set.of(lea, tom), false, null)));

        // Récurrence annuelle
        report(reminderService.create(new ReminderRequest("Anniversaire de Mamie", null, ReminderType.AUTRE,
                at(today.plusDays(20), 12, 0), null,
                Set.of(maman, papa, lea, tom), true,
                new RecurrenceRuleRequest(RecurrenceFrequency.YEARLY, 1, null, null, 10))));
    }

    private void report(ReminderWithAgendaDTO created) {
        log.info("Reminder '{}' créé : {} entrée(s) d'agenda, du {} au {}", created.reminder().titre(),
                created.agenda().nombre(), created.agenda().premiereDate(), created.agenda().derniereDate());
    }

    private static LocalDate next(LocalDate from, DayOfWeek day) {
        return from.with(TemporalAdjusters.next(day));
    }

    private static LocalDateTime at(LocalDate date, int hour, int minute) {
        return LocalDateTime.of(date, LocalTime.of(hour, minute));
    }
}
