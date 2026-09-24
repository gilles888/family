package com.family.agenda.controller;

import com.family.agenda.repository.AgendaEntryRepository;
import com.family.agenda.repository.FamilyMemberRepository;
import com.family.agenda.repository.ReminderRepository;
import com.family.agenda.scheduler.AgendaExtensionScheduler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Scénarios de bout en bout (H2, horloge simulée : "aujourd'hui" = lundi 2026-09-21 10:00, horizon = 6 mois).
 */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
class AgendaFlowIntegrationTest {

    static class MutableClock extends Clock {
        volatile Instant instant = Instant.parse("2026-09-21T08:00:00Z"); // 10:00 à Paris (UTC+2)

        @Override public ZoneId getZone() { return ZoneOffset.ofHours(2); }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return instant; }
    }

    @TestConfiguration
    static class ClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock();
        }
    }

    @Autowired MockMvc mvc;
    @Autowired MutableClock clock;
    @Autowired AgendaExtensionScheduler scheduler;
    @Autowired AgendaEntryRepository entryRepository;
    @Autowired ReminderRepository reminderRepository;
    @Autowired FamilyMemberRepository memberRepository;

    @BeforeEach
    void reset() {
        clock.instant = Instant.parse("2026-09-21T08:00:00Z");
        entryRepository.deleteAll();
        reminderRepository.deleteAll();
        memberRepository.deleteAll();
    }

    private long createMember(String nom) throws Exception {
        String body = mvc.perform(post("/v1/membres").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nom\":\"%s\",\"couleur\":\"#112233\"}".formatted(nom)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    private ResultActions createReminder(String json) throws Exception {
        return mvc.perform(post("/v1/reminders").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String weeklySport(long membre, String start, String recurrence) {
        return """
                {"titre":"Foot","type":"SPORT","dateHeureDebut":"%s","dateHeureFin":"%s","membreIds":[%d],
                 "isRecurring":true,"recurrence":%s}""".formatted(start, start.replace("T18", "T19"), membre, recurrence);
    }

    private ResultActions agenda(String debut, String fin) throws Exception {
        return mvc.perform(get("/v1/agenda").param("dateDebut", debut).param("dateFin", fin));
    }

    private long reminderId(ResultActions created) throws Exception {
        String body = created.andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll(".*?\"reminder\":\\{\"id\":(\\d+).*", "$1"));
    }

    @Test
    void oneShotReminderCreatesExactlyOneVisibleEntry() throws Exception {
        long papa = createMember("Papa");
        createReminder("""
                {"titre":"Prise de sang","type":"TEST_MEDICAL","dateHeureDebut":"2026-10-01T08:30:00",
                 "membreIds":[%d],"isRecurring":false}""".formatted(papa))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reminder.isRecurring").value(false))
                .andExpect(jsonPath("$.agenda.nombre").value(1))
                .andExpect(jsonPath("$.agenda.premiereDate").value("2026-10-01T08:30:00"))
                .andExpect(jsonPath("$.agenda.derniereDate").value("2026-10-01T08:30:00"));

        agenda("2026-10-01", "2026-10-01")
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].titre").value("Prise de sang"))
                .andExpect(jsonPath("$[0].statut").value("PREVU"))
                .andExpect(jsonPath("$[0].dateHeureFin").doesNotExist());
    }

    @Test
    void recurringReminderGeneratesTheWholeWindowAndIsImmediatelyInTheAgenda() throws Exception {
        long tom = createMember("Tom");
        // mardis et jeudis 18:00, dès le mardi 22/09, horizon = 21/03/2027
        createReminder(weeklySport(tom, "2026-09-22T18:00:00",
                "{\"frequence\":\"WEEKLY\",\"joursSemaine\":[\"TUESDAY\",\"THURSDAY\"]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.agenda.nombre").value(52))
                .andExpect(jsonPath("$.agenda.premiereDate").value("2026-09-22T18:00:00"))
                .andExpect(jsonPath("$.agenda.derniereDate").value("2027-03-18T18:00:00"));

        assertThat(entryRepository.count()).isEqualTo(52);
        agenda("2026-09-21", "2026-09-27")
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].dateHeure").value("2026-09-22T18:00:00"))
                .andExpect(jsonPath("$[0].dateHeureFin").value("2026-09-22T19:00:00"))
                .andExpect(jsonPath("$[1].dateHeure").value("2026-09-24T18:00:00"));
    }

    @Test
    void patchChangesOnlyOneOccurrence() throws Exception {
        long tom = createMember("Tom");
        createReminder(weeklySport(tom, "2026-09-22T18:00:00", "{\"frequence\":\"WEEKLY\",\"nombreOccurrences\":4}"));
        long firstId = entryRepository.findAll().stream().sorted((a, b) -> a.getDateHeure().compareTo(b.getDateHeure()))
                .findFirst().orElseThrow().getId();

        mvc.perform(patch("/v1/agenda/entries/{id}", firstId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\":\"ANNULE\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("ANNULE"));

        assertThat(entryRepository.findAll()).filteredOn(e -> e.getStatut().name().equals("PREVU")).hasSize(3);
        mvc.perform(patch("/v1/agenda/entries/{id}", firstId).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatingRegeneratesFutureEntriesKeepsPastAndPreservesStillValidStatuses() throws Exception {
        long tom = createMember("Tom");
        // Commencé il y a 2 semaines (lundi 07/09) : 2 occurrences passées (07/09, 14/09), le reste dans le futur
        long id = reminderId(createReminder(weeklySport(tom, "2026-09-07T18:00:00",
                "{\"frequence\":\"WEEKLY\",\"nombreOccurrences\":6}")));
        agenda("2026-09-07", "2026-09-20").andExpect(jsonPath("$", hasSize(2)));

        // On annule à la main l'occurrence du 28/09 (future)
        long entry28 = entryRepository.findAll().stream()
                .filter(e -> e.getDateHeure().toString().startsWith("2026-09-28")).findFirst().orElseThrow().getId();
        mvc.perform(patch("/v1/agenda/entries/{id}", entry28).contentType(MediaType.APPLICATION_JSON)
                .content("{\"statut\":\"ANNULE\"}")).andExpect(status().isOk());

        // Modification : mêmes horaires mais plus que 4 occurrences au total (07/09, 14/09, 21/09, 28/09)
        mvc.perform(put("/v1/reminders/{id}", id).contentType(MediaType.APPLICATION_JSON)
                        .content(weeklySport(tom, "2026-09-07T18:00:00", "{\"frequence\":\"WEEKLY\",\"nombreOccurrences\":4}")))
                .andExpect(status().isOk());

        assertThat(entryRepository.findAll()).extracting(e -> e.getDateHeure().toLocalDate().toString())
                .containsExactlyInAnyOrder("2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28");
        // 21/09 18:00 est encore dans le futur (il est 10:00) ; l'annulation du 28/09 a survécu
        assertThat(entryRepository.findById(entry28)).get().extracting(e -> e.getStatut().name()).isEqualTo("ANNULE");

        // Changement d'horaire : les futures passent à 19:00, les passées (18:00) restent
        mvc.perform(put("/v1/reminders/{id}", id).contentType(MediaType.APPLICATION_JSON)
                        .content(weeklySport(tom, "2026-09-07T19:00:00", "{\"frequence\":\"WEEKLY\",\"nombreOccurrences\":4}")))
                .andExpect(status().isOk());
        assertThat(entryRepository.findAll()).extracting(e -> e.getDateHeure().toString()).containsExactlyInAnyOrder(
                "2026-09-07T18:00", "2026-09-14T18:00", "2026-09-21T19:00", "2026-09-28T19:00");
    }

    @Test
    void deletingKeepsPastEntriesAndRemovesFutureOnes() throws Exception {
        long tom = createMember("Tom");
        long id = reminderId(createReminder(weeklySport(tom, "2026-09-07T18:00:00", "{\"frequence\":\"WEEKLY\"}")));
        assertThat(entryRepository.count()).isGreaterThan(20);

        mvc.perform(delete("/v1/reminders/{id}", id)).andExpect(status().isNoContent());

        mvc.perform(get("/v1/reminders/{id}", id)).andExpect(status().isNotFound());
        mvc.perform(get("/v1/reminders")).andExpect(jsonPath("$", hasSize(0)));
        assertThat(entryRepository.findAll()).extracting(e -> e.getDateHeure().toString())
                .containsExactlyInAnyOrder("2026-09-07T18:00", "2026-09-14T18:00");
        agenda("2026-09-01", "2026-09-30").andExpect(jsonPath("$[0].titre").value("Foot"));
    }

    @Test
    void nightlyJobExtendsTheWindowWithoutDuplicatesOrTouchingExistingEntries() throws Exception {
        long tom = createMember("Tom");
        createReminder(weeklySport(tom, "2026-09-23T18:00:00", "{\"frequence\":\"WEEKLY\"}"))
                .andExpect(jsonPath("$.agenda.nombre").value(26)); // 23/09/2026 -> 17/03/2027
        long firstId = entryRepository.findAll().stream().findFirst().orElseThrow().getId();
        mvc.perform(patch("/v1/agenda/entries/{id}", firstId).contentType(MediaType.APPLICATION_JSON)
                .content("{\"statut\":\"COMPLETE\"}"));

        assertThat(scheduler.run()).isZero(); // rien à ajouter le jour même : idempotent

        clock.instant = Instant.parse("2026-11-21T08:00:00Z"); // +2 mois
        assertThat(scheduler.run()).isEqualTo(9); // 24/03 -> 19/05/2027 : 9 mercredis
        assertThat(scheduler.run()).isZero();
        assertThat(entryRepository.count()).isEqualTo(35);
        assertThat(entryRepository.findById(firstId)).get().extracting(e -> e.getStatut().name()).isEqualTo("COMPLETE");
    }

    @Test
    void nightlyJobIgnoresFinishedAndDeletedRecurrences() throws Exception {
        long tom = createMember("Tom");
        createReminder(weeklySport(tom, "2026-09-23T18:00:00", "{\"frequence\":\"WEEKLY\",\"nombreOccurrences\":3}"));
        long deleted = reminderId(createReminder(weeklySport(tom, "2026-09-24T18:00:00", "{\"frequence\":\"WEEKLY\"}")));
        mvc.perform(delete("/v1/reminders/{id}", deleted)).andExpect(status().isNoContent());

        clock.instant = Instant.parse("2027-01-21T08:00:00Z");
        assertThat(scheduler.run()).isZero();
        assertThat(entryRepository.count()).isEqualTo(3);
    }

    @Test
    void agendaViewsFilterByMemberAndGroup() throws Exception {
        long tom = createMember("Tom");
        long lea = createMember("Léa");
        createReminder(weeklySport(tom, "2026-09-22T18:00:00", "{\"frequence\":\"WEEKLY\",\"nombreOccurrences\":3}"));
        createReminder("""
                {"titre":"Dentiste","type":"RENDEZ_VOUS","dateHeureDebut":"2026-09-29T16:00:00",
                 "membreIds":[%d,%d],"isRecurring":false}""".formatted(lea, tom));

        mvc.perform(get("/v1/agenda").param("dateDebut", "2026-09-01").param("dateFin", "2026-09-30"))
                .andExpect(jsonPath("$", hasSize(3)));
        mvc.perform(get("/v1/agenda").param("dateDebut", "2026-09-01").param("dateFin", "2026-09-30").param("membreId", "" + lea))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].membres", hasSize(2)));

        mvc.perform(get("/v1/agenda/jour/2026-09-29"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].titre").value("Dentiste")); // 16:00 avant 18:00

        // semaine du lundi 28/09 au dimanche 04/10, demandée via un mercredi : 29/09 x2 (dentiste + foot)
        mvc.perform(get("/v1/agenda/semaine/2026-09-30"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].titre").value("Dentiste"));
        mvc.perform(get("/v1/agenda/semaine/2026-10-04")) // dimanche : reste dans la même semaine
                .andExpect(jsonPath("$", hasSize(2)));
        mvc.perform(get("/v1/agenda/semaine/2026-09-30").param("membreId", "" + lea))
                .andExpect(jsonPath("$", hasSize(1)));

        mvc.perform(get("/v1/agenda/mois/2026/9"))
                .andExpect(jsonPath("$['2026-09-22']", hasSize(1)))
                .andExpect(jsonPath("$['2026-09-29']", hasSize(2)))
                .andExpect(jsonPath("$['2026-09-23']").doesNotExist());

        mvc.perform(get("/v1/agenda/annee/2026"))
                .andExpect(jsonPath("$.total").value(4))
                .andExpect(jsonPath("$.mois", hasSize(12)))
                .andExpect(jsonPath("$.mois[8].total").value(3))   // 22/09 + 29/09 + dentiste
                .andExpect(jsonPath("$.mois[9].total").value(1))   // 6/10
                .andExpect(jsonPath("$.mois[8].parType.SPORT").value(2))
                .andExpect(jsonPath("$.mois[8].parType.RENDEZ_VOUS").value(1))
                .andExpect(jsonPath("$.mois[0].total").value(0));
        mvc.perform(get("/v1/agenda/annee/2026").param("membreId", "" + lea))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void errorsAreReportedAsProblemDetails() throws Exception {
        mvc.perform(get("/v2/agenda/jour/2026-09-29")).andExpect(status().isBadRequest());
        mvc.perform(get("/v1/agenda/mois/2026/13")).andExpect(status().isBadRequest());
        agenda("2026-09-30", "2026-09-01").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        createReminder("""
                {"titre":"","type":"SPORT","dateHeureDebut":"2026-09-22T18:00:00","dateHeureFin":"2026-09-22T17:00:00",
                 "isRecurring":true}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.titre").exists())
                .andExpect(jsonPath("$.errors.dateHeureFin").exists())
                .andExpect(jsonPath("$.errors.recurrence").exists());
        createReminder("""
                {"titre":"x","type":"SPORT","dateHeureDebut":"2026-09-22T18:00:00","isRecurring":true,
                 "recurrence":{"frequence":"DAILY","dateFin":"2026-10-01","nombreOccurrences":3}}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['recurrence.dateFin']").exists());
        mvc.perform(get("/v1/reminders/999")).andExpect(status().isNotFound());
    }

    @Test
    void deletingAMemberKeepsTheirReminders() throws Exception {
        long tom = createMember("Tom");
        long id = reminderId(createReminder(weeklySport(tom, "2026-09-22T18:00:00", "{\"frequence\":\"WEEKLY\",\"nombreOccurrences\":2}")));
        mvc.perform(delete("/v1/membres/{id}", tom)).andExpect(status().isNoContent());
        mvc.perform(get("/v1/reminders/{id}", id)).andExpect(status().isOk()).andExpect(jsonPath("$.membres", hasSize(0)));
    }
}
