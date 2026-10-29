package com.family.agenda.controller;

import com.family.agenda.entity.FamilySettings;
import com.family.agenda.repository.FamilySettingsRepository;
import com.family.agenda.support.ParentMockMvc;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Thème de la famille (/v1/parametres/theme) et date de naissance des membres (H2, tests annulés). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
@Import(ParentMockMvc.class)
@Transactional
class ThemeSettingsApiTest {

    @Autowired MockMvc mvc;
    @Autowired FamilySettingsRepository settings;
    @Autowired Clock clock;

    private LocalDate today;
    private long lea;

    @BeforeEach
    void setUp() throws Exception {
        today = LocalDate.now(clock);
        String body = mvc.perform(post("/v1/membres").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nom\": \"Léa\", \"couleur\": \"#E91E63\", \"dateNaissance\": \"2017-03-14\" }"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dateNaissance").value("2017-03-14"))
                .andReturn().getResponse().getContentAsString();
        lea = Long.parseLong(body.replaceAll("^\\{\"id\":(\\d+).*", "$1"));
    }

    private ResultActions putTheme(String json) throws Exception {
        return mvc.perform(put("/v1/parametres/theme").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String body(String mode, String theme, Long membre, LocalDate jusqua) {
        return """
                { "mode": "%s", "theme": %s, "membreId": %s, "jusqua": %s,
                  "anniversairesActifs": true, "enfantsPeuventChoisir": false }"""
                .formatted(mode, theme == null ? "null" : "\"" + theme + "\"", membre, jusqua == null ? "null" : "\"" + jusqua + "\"");
    }

    @Test
    void parDefautAutomatique() throws Exception {
        mvc.perform(get("/v1/parametres/theme"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("AUTO"))
                .andExpect(jsonPath("$.anniversairesActifs").value(true))
                .andExpect(jsonPath("$.enfantsPeuventChoisir").value(false));
    }

    @Test
    void forceUnThemeEtLeRenvoie() throws Exception {
        putTheme(body("FORCE", "NOEL", null, today.plusDays(3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("FORCE"))
                .andExpect(jsonPath("$.theme").value("NOEL"));
        mvc.perform(get("/v1/parametres/theme"))
                .andExpect(jsonPath("$.theme").value("NOEL"))
                .andExpect(jsonPath("$.jusqua").value(today.plusDays(3).toString()));
    }

    @Test
    void forceUnAnniversaireAvecSonMembre() throws Exception {
        putTheme(body("FORCE", "ANNIVERSAIRE", lea, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.membreId").value(lea));
    }

    @Test
    void validations() throws Exception {
        putTheme(body("FORCE", null, null, null)).andExpect(status().isBadRequest());
        putTheme(body("FORCE", "ANNIVERSAIRE", null, null)).andExpect(status().isBadRequest());
        putTheme(body("FORCE", "ANNIVERSAIRE", 999_999L, null)).andExpect(status().isBadRequest());
        putTheme(body("FORCE", "NOEL", null, today.minusDays(1))).andExpect(status().isBadRequest());
        putTheme("{ \"mode\": \"INCONNU\" }").andExpect(status().isBadRequest());
    }

    @Test
    void autoEtOffEffacentLeThemeForce() throws Exception {
        putTheme(body("FORCE", "PAQUES", null, null)).andExpect(status().isOk());
        putTheme(body("OFF", "PAQUES", null, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("OFF"))
                .andExpect(jsonPath("$.theme").doesNotExist());
    }

    @Test
    void themeEchuRepasseEnAuto() throws Exception {
        putTheme(body("FORCE", "NOEL", null, today)).andExpect(status().isOk());
        FamilySettings s = settings.findById(FamilySettings.ID).orElseThrow();
        s.setThemeForceJusqua(today.minusDays(1));
        settings.saveAndFlush(s);

        mvc.perform(get("/v1/parametres/theme"))
                .andExpect(jsonPath("$.mode").value("AUTO"))
                .andExpect(jsonPath("$.theme").doesNotExist())
                .andExpect(jsonPath("$.jusqua").doesNotExist());
        org.assertj.core.api.Assertions.assertThat(settings.findById(FamilySettings.ID).orElseThrow().getThemeMode().name())
                .isEqualTo("AUTO");
    }

    @Test
    void membreFeteSupprimeRepasseEnAuto() throws Exception {
        putTheme(body("FORCE", "ANNIVERSAIRE", lea, null)).andExpect(status().isOk());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/v1/membres/{id}", lea))
                .andExpect(status().isNoContent());
        settings.flush();
        // le front de la base (on delete set null) est simulé : l'entité en cache garde l'id, on la rafraîchit
        FamilySettings s = settings.findById(FamilySettings.ID).orElseThrow();
        s.setThemeForceMembreId(null);
        settings.saveAndFlush(s);

        mvc.perform(get("/v1/parametres/theme")).andExpect(jsonPath("$.mode").value("AUTO"));
    }

    @Test
    void dateDeNaissanceFutureRefusee() throws Exception {
        mvc.perform(post("/v1/membres").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nom\": \"X\", \"couleur\": \"#E91E63\", \"dateNaissance\": \"" + today.plusDays(1) + "\" }"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void dateDeNaissanceModifiableEtFacultative() throws Exception {
        mvc.perform(put("/v1/membres/{id}", lea).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nom\": \"Léa\", \"couleur\": \"#E91E63\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateNaissance").doesNotExist());
    }
}
