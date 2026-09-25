package com.family.agenda.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Endpoints des routines (H2, chaque test annulé en fin d'exécution). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
@Transactional
class RoutineApiTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired Clock clock;

    private long tom;
    private LocalDate today;

    @BeforeEach
    void setUp() throws Exception {
        today = LocalDate.now(clock);
        tom = read(postJson("/v1/membres", "{ \"nom\": \"Tom\", \"couleur\": \"#4CAF50\" }").andExpect(status().isCreated()))
                .get("id").asLong();
    }

    private ResultActions postJson(String url, String body) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private JsonNode read(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }

    @Test
    void modelesEnDeuxLangues() throws Exception {
        mvc.perform(get("/v1/routines/modeles").param("langue", "nl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].nom").value("Mijn ochtendroutine"))
                .andExpect(jsonPath("$[0].etapes", hasSize(10)))
                .andExpect(jsonPath("$[1].sousTitre").value("Rustig naar een fijne nacht!"));
        mvc.perform(get("/v1/routines/modeles"))
                .andExpect(jsonPath("$[0].nom").value("Ma routine du matin"));
    }

    @Test
    void parcoursComplet() throws Exception {
        JsonNode routine = read(postJson("/v1/membres/" + tom + "/routines/modele", "{ \"modele\": \"soir\", \"langue\": \"nl\" }")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.theme").value("NIGHT"))
                .andExpect(jsonPath("$.heureDebut").value("18:30:00"))
                .andExpect(jsonPath("$.etat.terminee").value(false)));
        long id = routine.get("id").asLong();
        JsonNode etapes = routine.get("etapes");

        mvc.perform(get("/v1/membres/{id}/routines", tom))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].etapes", hasSize(9)));

        String run = "/v1/routines/" + id + "/runs/" + today;
        mvc.perform(post(run + "/recompense")).andExpect(status().isConflict());
        for (int i = 0; i < etapes.size(); i++) {
            mvc.perform(post(run + "/etapes/" + etapes.get(i).get("id").asLong() + "/toggle"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.etapesCochees", hasSize(i + 1)))
                    .andExpect(jsonPath("$.terminee").value(i == etapes.size() - 1));
        }
        mvc.perform(post(run + "/recompense")).andExpect(status().isOk()).andExpect(jsonPath("$.recompenseJouee").value(true));
        mvc.perform(post(run + "/recompense")).andExpect(status().isConflict());

        mvc.perform(get("/v1/membres/{id}/routines/historique", tom))
                .andExpect(jsonPath("$", hasSize(14)))
                .andExpect(jsonPath("$[13].routinesTerminees[0]").value(id));

        mvc.perform(delete("/v1/routines/{id}", id)).andExpect(status().isNoContent());
        mvc.perform(get("/v1/routines/{id}", id)).andExpect(status().isNotFound());
    }

    @Test
    void cocherUnAutreJourEstRefuse() throws Exception {
        JsonNode routine = read(postJson("/v1/membres/" + tom + "/routines/modele", "{ \"modele\": \"matin\", \"langue\": \"fr\" }"));
        long step = routine.get("etapes").get(0).get("id").asLong();

        mvc.perform(post("/v1/routines/{id}/runs/{date}/etapes/{step}/toggle", routine.get("id").asLong(), today.minusDays(1), step))
                .andExpect(status().isBadRequest());
    }

    @Test
    void creationModificationEtReordonnancement() throws Exception {
        JsonNode routine = read(postJson("/v1/routines", """
                { "membreId": %d, "nom": "Ma routine", "type": "CUSTOM", "theme": "DAY", "jours": ["SATURDAY"],
                  "etapes": [ { "libelle": "Je range mes jouets.", "icone": "toys" }, { "libelle": "Bravo !", "icone": "finish" } ] }"""
                .formatted(tom)).andExpect(status().isCreated()).andExpect(jsonPath("$.active").value(true)));
        long id = routine.get("id").asLong();
        long a = routine.get("etapes").get(0).get("id").asLong();
        long b = routine.get("etapes").get(1).get("id").asLong();

        mvc.perform(put("/v1/routines/{id}/etapes/ordre", id).contentType(MediaType.APPLICATION_JSON).content("[%d, %d]".formatted(b, a)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.etapes[0].libelle").value("Bravo !"));
        mvc.perform(put("/v1/routines/{id}/etapes/ordre", id).contentType(MediaType.APPLICATION_JSON).content("[%d]".formatted(a)))
                .andExpect(status().isBadRequest());

        mvc.perform(put("/v1/routines/{id}", id).contentType(MediaType.APPLICATION_JSON).content("""
                        { "nom": "Samedi", "type": "CUSTOM", "theme": "NIGHT", "jours": [], "active": false,
                          "heureDebut": "09:00", "heureFin": "08:00", "etapes": [] }"""))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/v1/routines/{id}", id).contentType(MediaType.APPLICATION_JSON).content("""
                        { "nom": "Samedi", "type": "CUSTOM", "theme": "NIGHT", "jours": [], "active": false,
                          "etapes": [ { "libelle": "Nouvelle", "icone": "Pas Valide" } ] }"""))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/v1/routines/{id}", id).contentType(MediaType.APPLICATION_JSON).content("""
                        { "nom": "Samedi", "type": "CUSTOM", "theme": "NIGHT", "jours": [], "active": false,
                          "etapes": [ { "id": %d, "libelle": "Bravo !", "icone": "finish" } ] }""".formatted(b)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.etapes", hasSize(1)))
                .andExpect(jsonPath("$.etapes[0].id").value(b));
    }

    @Test
    void membreSupprimeSupprimeSesRoutines() throws Exception {
        postJson("/v1/membres/" + tom + "/routines/modele", "{ \"modele\": \"matin\", \"langue\": \"fr\" }").andExpect(status().isCreated());

        mvc.perform(delete("/v1/membres/{id}", tom)).andExpect(status().isNoContent());
        mvc.perform(get("/v1/membres/{id}/routines", tom)).andExpect(status().isNotFound());
    }
}
