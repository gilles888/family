package com.family.agenda.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Endpoints liste de courses et garde-manger (H2, chaque test annulé en fin d'exécution). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
@Transactional
class ShoppingListApiTest {

    private static final String PERIODE = """
            { "dateDebut": "2026-09-21", "dateFin": "2026-09-27" }""";

    @Autowired MockMvc mvc;

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
                               String json) throws Exception {
        return mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private long id(ResultActions result) throws Exception {
        String body = result.andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll("^\\{\"id\":(\\d+).*", "$1"));
    }

    @Test
    void listeVideAvantLaPremiereGeneration() throws Exception {
        mvc.perform(get("/v1/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateDebut").doesNotExist())
                .andExpect(jsonPath("$.articles", hasSize(0)));
    }

    @Test
    void generationDepuisLesRepas() throws Exception {
        long recette = id(send(post("/v1/recettes"), """
                { "nom": "Soupe", "portions": 4, "ingredients": [
                    { "nom": "Carotte", "quantite": 4, "unite": "PIECE" },
                    { "nom": "Sel", "quantite": 1, "unite": "PINCEE" } ] }""").andExpect(status().isCreated()));
        send(post("/v1/repas"), """
                { "date": "2026-09-23", "creneau": "SOUPER", "portions": 6, "recetteId": %d }""".formatted(recette))
                .andExpect(status().isCreated());

        send(post("/v1/courses/generer"), PERIODE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateDebut").value("2026-09-21"))
                .andExpect(jsonPath("$.articles", hasSize(2)))
                .andExpect(jsonPath("$.articles[0].nom").value("Carotte"))
                .andExpect(jsonPath("$.articles[0].quantite").value(6))
                .andExpect(jsonPath("$.articles[0].aLaMaison").value(false))
                .andExpect(jsonPath("$.articles[0].sources[0].titre").value("Soupe"))
                .andExpect(jsonPath("$.articles[0].sources[0].creneau").value("SOUPER"))
                .andExpect(jsonPath("$.articles[1].nom").value("Sel"))
                .andExpect(jsonPath("$.articles[1].aLaMaison").value(true));
    }

    @Test
    void periodeInvalide() throws Exception {
        send(post("/v1/courses/generer"), """
                { "dateDebut": "2026-09-27", "dateFin": "2026-09-21" }""").andExpect(status().isBadRequest());
        send(post("/v1/courses/generer"), "{}").andExpect(status().isBadRequest());
    }

    @Test
    void articleManuelModificationStatutsEtSuppression() throws Exception {
        long lait = id(send(post("/v1/courses/articles"), """
                { "nom": "Lait", "quantite": 2, "unite": "L" }""")
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/v1/courses/articles/")))
                .andExpect(jsonPath("$.origine").value("MANUEL")));

        send(put("/v1/courses/articles/" + lait), """
                { "nom": "Lait demi-écrémé", "quantite": 3, "unite": "L" }""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Lait demi-écrémé"))
                .andExpect(jsonPath("$.quantite").value(3));

        send(patch("/v1/courses/articles/" + lait), """
                { "achete": true }""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.achete").value(true))
                .andExpect(jsonPath("$.aLaMaison").value(false));
        send(patch("/v1/courses/articles/" + lait), "{}").andExpect(status().isBadRequest());

        mvc.perform(delete("/v1/courses/articles/achetes")).andExpect(status().isNoContent());
        mvc.perform(get("/v1/courses")).andExpect(jsonPath("$.articles", hasSize(0)));
        mvc.perform(delete("/v1/courses/articles/" + lait)).andExpect(status().isNotFound());
    }

    @Test
    void articleInvalide() throws Exception {
        send(post("/v1/courses/articles"), """
                { "nom": " " }""").andExpect(status().isBadRequest());
        send(post("/v1/courses/articles"), """
                { "nom": "Lait", "unite": "L" }""").andExpect(status().isBadRequest());
        send(post("/v1/courses/articles"), """
                { "nom": "Lait", "quantite": -1 }""").andExpect(status().isBadRequest());
    }

    @Test
    void gardeManger() throws Exception {
        mvc.perform(get("/v1/garde-manger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].nom", hasItem("Sel")));

        long farine = id(send(post("/v1/garde-manger"), """
                { "nom": "Farine" }""")
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/v1/garde-manger/"))));
        send(post("/v1/garde-manger"), """
                { "nom": " FARINE " }""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(farine));

        mvc.perform(delete("/v1/garde-manger/" + farine)).andExpect(status().isNoContent());
        mvc.perform(get("/v1/garde-manger")).andExpect(jsonPath("$[*].nom", not(hasItem("Farine"))));
        mvc.perform(delete("/v1/garde-manger/" + farine)).andExpect(status().isNotFound());
    }
}
