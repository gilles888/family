package com.family.agenda.security;

import com.family.agenda.dto.FamilyMemberRequest;
import com.family.agenda.dto.RoutineDTO;
import com.family.agenda.entity.AccountRole;
import com.family.agenda.service.AccountService;
import com.family.agenda.service.FamilyMemberService;
import com.family.agenda.service.RoutineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.EnumSet;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Compte ENFANT (Léa) : lecture de l'agenda, des repas et des membres ; ses routines seulement ; aucune écriture
 * ailleurs. Contrôles faits par le backend (H2, tests annulés).
 */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
@Transactional
class ChildRoleApiTest {

    private static final String MOT_DE_PASSE = "mot-de-passe-lea-1";

    @Autowired MockMvc mvc;
    @Autowired AccountService accountService;
    @Autowired FamilyMemberService memberService;
    @Autowired RoutineService routineService;
    @Autowired Clock clock;

    private MockHttpSession lea;
    private Long leaId;
    private Long tomId;
    private RoutineDTO routineLea;
    private RoutineDTO routineTom;
    private LocalDate today;

    @BeforeEach
    void setUp() throws Exception {
        today = LocalDate.now(clock);
        leaId = memberService.create(new FamilyMemberRequest("Léa", "#FF9800")).id();
        tomId = memberService.create(new FamilyMemberRequest("Tom", "#4CAF50")).id();
        EnumSet<DayOfWeek> tousLesJours = EnumSet.allOf(DayOfWeek.class);
        routineLea = routineService.applyTemplate(leaId, "matin", "fr", tousLesJours, null, null);
        routineTom = routineService.applyTemplate(tomId, "matin", "fr", tousLesJours, null, null);
        accountService.newAccount("lea", AccountRole.ENFANT, leaId, MOT_DE_PASSE, false);
        lea = Logins.session(mvc, "lea", MOT_DE_PASSE);
    }

    private void expectForbidden(HttpMethod method, String url) throws Exception {
        mvc.perform(request(method, url).session(lea).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACTION_NON_AUTORISEE"));
    }

    @Test
    void lectureDeLAgendaDesRepasEtDesMembres() throws Exception {
        mvc.perform(get("/v1/auth/me").session(lea))
                .andExpect(jsonPath("$.role").value("ENFANT"))
                .andExpect(jsonPath("$.membreId").value(leaId))
                .andExpect(jsonPath("$.membreNom").value("Léa"));
        mvc.perform(get("/v1/agenda/jour/{date}", today).session(lea)).andExpect(status().isOk());
        mvc.perform(get("/v1/agenda/semaine/{date}", today).session(lea)).andExpect(status().isOk());
        mvc.perform(get("/v1/repas").param("dateDebut", today.toString()).param("dateFin", today.plusDays(6).toString())
                .session(lea)).andExpect(status().isOk());
        mvc.perform(get("/v1/recettes").session(lea)).andExpect(status().isOk());
        mvc.perform(get("/v1/membres").session(lea)).andExpect(status().isOk());
    }

    @Test
    void ecrituresInterdites() throws Exception {
        expectForbidden(HttpMethod.POST, "/v1/reminders");
        expectForbidden(HttpMethod.PUT, "/v1/reminders/1");
        expectForbidden(HttpMethod.DELETE, "/v1/reminders/1");
        expectForbidden(HttpMethod.PATCH, "/v1/agenda/entries/1");
        expectForbidden(HttpMethod.DELETE, "/v1/agenda/entries/1");
        expectForbidden(HttpMethod.POST, "/v1/repas");
        expectForbidden(HttpMethod.DELETE, "/v1/repas/1");
        expectForbidden(HttpMethod.POST, "/v1/recettes");
        expectForbidden(HttpMethod.PUT, "/v1/recettes/1");
        expectForbidden(HttpMethod.POST, "/v1/courses/generer");
        expectForbidden(HttpMethod.POST, "/v1/courses/articles");
        expectForbidden(HttpMethod.PATCH, "/v1/courses/articles/1");
        expectForbidden(HttpMethod.POST, "/v1/garde-manger");
        expectForbidden(HttpMethod.POST, "/v1/membres");
        expectForbidden(HttpMethod.PUT, "/v1/membres/" + leaId);
        expectForbidden(HttpMethod.PUT, "/v1/membres/" + tomId + "/avatar");
        expectForbidden(HttpMethod.DELETE, "/v1/membres/" + tomId);
        expectForbidden(HttpMethod.POST, "/v1/comptes");
        expectForbidden(HttpMethod.PUT, "/v1/comptes/1");
        expectForbidden(HttpMethod.POST, "/v1/comptes/1/mot-de-passe");
        expectForbidden(HttpMethod.POST, "/v1/routines");
        expectForbidden(HttpMethod.PUT, "/v1/routines/" + routineLea.id());
        expectForbidden(HttpMethod.DELETE, "/v1/routines/" + routineLea.id());
        expectForbidden(HttpMethod.POST, "/v1/membres/" + leaId + "/routines/modele");
        expectForbidden(HttpMethod.POST, "/v1/membres/" + leaId + "/etoiles/retraits");
        expectForbidden(HttpMethod.DELETE, "/v1/membres/" + leaId + "/etoiles/retraits/1");
    }

    @Test
    void lecturesReserveesAuxParents() throws Exception {
        expectForbidden(HttpMethod.GET, "/v1/comptes");
        expectForbidden(HttpMethod.GET, "/v1/courses");
        expectForbidden(HttpMethod.GET, "/v1/garde-manger");
        expectForbidden(HttpMethod.GET, "/v1/reminders");
        expectForbidden(HttpMethod.GET, "/v1/routines/modeles");
    }

    @Test
    void cocheUneEtapeDeSaRoutine() throws Exception {
        Long step = routineLea.etapes().getFirst().id();

        mvc.perform(get("/v1/membres/{id}/routines", leaId).session(lea)).andExpect(status().isOk());
        mvc.perform(get("/v1/membres/{id}/routines/historique", leaId).session(lea)).andExpect(status().isOk());
        mvc.perform(get("/v1/routines/{id}", routineLea.id()).session(lea)).andExpect(status().isOk());
        mvc.perform(post("/v1/routines/{id}/runs/{date}/etapes/{step}/toggle", routineLea.id(), today, step)
                        .session(lea).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.etapesCochees[0]").value(step));
    }

    @Test
    void routineDUnAutreMembreInterdite() throws Exception {
        Long step = routineTom.etapes().getFirst().id();

        expectForbidden(HttpMethod.GET, "/v1/membres/" + tomId + "/routines");
        expectForbidden(HttpMethod.GET, "/v1/membres/" + tomId + "/routines/historique");
        expectForbidden(HttpMethod.GET, "/v1/routines/" + routineTom.id());
        expectForbidden(HttpMethod.POST, "/v1/routines/%d/runs/%s/etapes/%d/toggle".formatted(routineTom.id(), today, step));
        expectForbidden(HttpMethod.POST, "/v1/routines/%d/runs/%s/recompense".formatted(routineTom.id(), today));
    }

    @Test
    void litSesRetraitsDEtoilesMaisPasCeuxDesAutres() throws Exception {
        mvc.perform(get("/v1/membres/{id}/etoiles/retraits", leaId).session(lea)).andExpect(status().isOk());
        mvc.perform(get("/v1/membres/{id}/etoiles", leaId).session(lea)).andExpect(status().isOk());
        expectForbidden(HttpMethod.GET, "/v1/membres/" + tomId + "/etoiles");
        expectForbidden(HttpMethod.GET, "/v1/membres/" + tomId + "/etoiles/retraits");
    }

    @Test
    void enfantNePeutPasSeRetirerDesEtoiles() throws Exception {
        mvc.perform(post("/v1/membres/{id}/etoiles/retraits", leaId).session(lea).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{ \"nombre\": 1, \"motif\": \"DISPUTE\" }"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACTION_NON_AUTORISEE"));
    }

    @Test
    void modifieSonPropreAvatar() throws Exception {
        mvc.perform(put("/v1/membres/{id}/avatar", leaId).session(lea).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"version\": 1, \"hat\": \"crown\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfig.hat").value("crown"));
    }

    @Test
    void avatarDUnAutreMembreInterdit() throws Exception {
        mvc.perform(put("/v1/membres/{id}/avatar", tomId).session(lea).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"version\": 1, \"hat\": \"crown\" }"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACTION_NON_AUTORISEE"));
    }
}
