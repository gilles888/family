package com.family.agenda.controller;

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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.LocalDate;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Étoiles retirées par un parent : retrait, annulation, solde dans l'historique (H2, tests annulés). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
@Import(ParentMockMvc.class)
@Transactional
class StarPenaltyApiTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired Clock clock;

    private long tom;
    private LocalDate today;

    @BeforeEach
    void setUp() throws Exception {
        today = LocalDate.now(clock);
        tom = read(postJson("/v1/membres", "{ \"nom\": \"Tom\", \"couleur\": \"#4CAF50\" }")).get("id").asLong();
    }

    private ResultActions postJson(String url, String body) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private JsonNode read(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }

    private ResultActions retirer(String body) throws Exception {
        return postJson("/v1/membres/" + tom + "/etoiles/retraits", body);
    }

    /** Termine une routine aujourd'hui : une étoile gagnée. */
    private void gagnerUneEtoile() throws Exception {
        JsonNode routine = read(postJson("/v1/membres/" + tom + "/routines/modele", "{ \"modele\": \"soir\", \"langue\": \"fr\" }"));
        for (JsonNode etape : routine.get("etapes")) {
            mvc.perform(post("/v1/routines/{id}/runs/{date}/etapes/{step}/toggle", routine.get("id").asLong(), today,
                    etape.get("id").asLong())).andExpect(status().isOk());
        }
    }

    @Test
    void soldeDeLHistoriqueGagneesMoinsRetirees() throws Exception {
        gagnerUneEtoile();
        retirer("{ \"nombre\": 2, \"motif\": \"DISPUTE\" }")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value(2))
                .andExpect(jsonPath("$.motif").value("DISPUTE"))
                .andExpect(jsonPath("$.date").value(today.toString()));
        retirer("{ \"nombre\": 1, \"motif\": \"AUTRE\", \"commentaire\": \"Porte claquée\", \"date\": \"" + today.minusDays(3) + "\" }")
                .andExpect(status().isCreated());

        JsonNode jours = read(mvc.perform(get("/v1/membres/{id}/routines/historique", tom)).andExpect(status().isOk()));
        int gagnees = 0;
        int retirees = 0;
        for (JsonNode jour : jours) {
            gagnees += jour.get("routinesTerminees").size();
            for (JsonNode retrait : jour.get("retraits")) {
                retirees += retrait.get("nombre").asInt();
            }
        }
        mvc.perform(get("/v1/membres/{id}/etoiles", tom))
                .andExpect(jsonPath("$.gagnees").value(1))
                .andExpect(jsonPath("$.retirees").value(3))
                .andExpect(jsonPath("$.solde").value(0)); // 1 − 3, jamais négatif
        org.junit.jupiter.api.Assertions.assertEquals(1, gagnees);
        org.junit.jupiter.api.Assertions.assertEquals(3, retirees);
        mvc.perform(get("/v1/membres/{id}/routines/historique", tom))
                .andExpect(jsonPath("$[13].retraits", hasSize(1)))
                .andExpect(jsonPath("$[10].retraits[0].commentaire").value("Porte claquée"));
    }

    @Test
    void motifAutreSansCommentaireRefuse() throws Exception {
        retirer("{ \"nombre\": 1, \"motif\": \"AUTRE\" }").andExpect(status().isBadRequest());
        retirer("{ \"nombre\": 1, \"motif\": \"AUTRE\", \"commentaire\": \"   \" }").andExpect(status().isBadRequest());
    }

    @Test
    void requeteInvalide() throws Exception {
        retirer("{ \"nombre\": 0, \"motif\": \"DISPUTE\" }").andExpect(status().isBadRequest());
        retirer("{ \"nombre\": 1 }").andExpect(status().isBadRequest());
        retirer("{ \"nombre\": 1, \"motif\": \"INCONNU\" }").andExpect(status().isBadRequest());
        retirer("{ \"nombre\": 1, \"motif\": \"DISPUTE\", \"date\": \"" + today.plusDays(1) + "\" }").andExpect(status().isBadRequest());
    }

    @Test
    void annulerUnRetraitRendLesEtoiles() throws Exception {
        long id = read(retirer("{ \"nombre\": 2, \"motif\": \"IMPOLITESSE\" }")).get("id").asLong();
        mvc.perform(get("/v1/membres/{id}/etoiles/retraits", tom))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        mvc.perform(delete("/v1/membres/{id}/etoiles/retraits/{r}", tom, id)).andExpect(status().isNoContent());
        mvc.perform(get("/v1/membres/{id}/etoiles/retraits", tom)).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(delete("/v1/membres/{id}/etoiles/retraits/{r}", tom, id)).andExpect(status().isNotFound());
    }

    @Test
    void membreIntrouvable() throws Exception {
        postJson("/v1/membres/999999/etoiles/retraits", "{ \"nombre\": 1, \"motif\": \"DISPUTE\" }").andExpect(status().isNotFound());
        mvc.perform(get("/v1/membres/999999/etoiles/retraits")).andExpect(status().isNotFound());
    }
}
