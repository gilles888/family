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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Endpoints recettes, ingrédients et repas (H2, chaque test annulé en fin d'exécution). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
@Transactional
class MealPlanningApiTest {

    private static final String BOLOGNAISE = """
            {
              "nom": "Spaghetti bolognaise", "description": "Le classique", "portions": 4, "tempsPreparation": 45,
              "instructions": "Faire revenir l'oignon.\\nMijoter 30 min.",
              "ingredients": [
                { "nom": "Spaghetti", "quantite": 400, "unite": "G" },
                { "nom": "Tomates pelées", "quantite": 1, "unite": "BOITE" },
                { "nom": "Oignon", "quantite": 1.5, "unite": "PIECE" }
              ]
            }""";

    @Autowired MockMvc mvc;

    private ResultActions postJson(String url, String json) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private long createRecipe() throws Exception {
        String body = postJson("/v1/recettes", BOLOGNAISE)
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/v1/recettes/")))
                .andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll("^\\{\"id\":(\\d+).*", "$1"));
    }

    private static String meal(String date, String creneau, int portions, Long recetteId, String libelle) {
        return """
                { "date": "%s", "creneau": "%s", "portions": %d, "recetteId": %s, "libelle": %s }"""
                .formatted(date, creneau, portions, recetteId, libelle == null ? "null" : "\"" + libelle + "\"");
    }

    @Test
    void recetteCreeeLueEtCherchee() throws Exception {
        long id = createRecipe();

        mvc.perform(get("/v1/recettes/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Spaghetti bolognaise"))
                .andExpect(jsonPath("$.ingredients", hasSize(3)))
                .andExpect(jsonPath("$.ingredients[2].nom").value("Oignon"))
                .andExpect(jsonPath("$.ingredients[2].unite").value("PIECE"));
        mvc.perform(get("/v1/recettes").param("q", "BOLO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(id));
        mvc.perform(get("/v1/ingredients").param("q", "tomate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nom").value("Tomates pelées"));
    }

    @Test
    void ficheAuProrata() throws Exception {
        long id = createRecipe();

        mvc.perform(get("/v1/recettes/{id}/fiche", id).param("portions", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.portionsRecette").value(4))
                .andExpect(jsonPath("$.portions").value(6))
                .andExpect(jsonPath("$.ingredients[0].quantite").value(600))
                .andExpect(jsonPath("$.ingredients[2].quantite").value(2.25));
        mvc.perform(get("/v1/recettes/{id}/fiche", id).param("portions", "0")).andExpect(status().isBadRequest());
        mvc.perform(get("/v1/recettes/{id}/fiche", 999_999)).andExpect(status().isNotFound());
    }

    @Test
    void recetteInvalide() throws Exception {
        postJson("/v1/recettes", """
                { "nom": "", "portions": 0, "ingredients": [ { "nom": "Sel", "quantite": -1, "unite": "PINCEE" } ] }""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.nom").exists())
                .andExpect(jsonPath("$.errors.portions").exists())
                .andExpect(jsonPath("$.errors['ingredients[0].quantite']").exists());
    }

    @Test
    void repasAvecRecetteOuLibelle() throws Exception {
        long recette = createRecipe();

        postJson("/v1/repas", meal("2026-09-24", "SOUPER", 6, recette, null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titre").value("Spaghetti bolognaise"))
                .andExpect(jsonPath("$.recetteId").value(recette));
        postJson("/v1/repas", meal("2026-09-24", "MIDI", 4, null, "Restes"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titre").value("Restes"));

        mvc.perform(get("/v1/repas").param("dateDebut", "2026-09-21").param("dateFin", "2026-09-27"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].creneau").value("MIDI"))
                .andExpect(jsonPath("$[1].creneau").value("SOUPER"));
    }

    @Test
    void repasSansRecetteNiLibelleOuAvecLesDeux() throws Exception {
        long recette = createRecipe();

        postJson("/v1/repas", meal("2026-09-24", "MIDI", 4, null, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.recetteId").exists());
        postJson("/v1/repas", meal("2026-09-24", "MIDI", 4, recette, "Restes"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void creneauDejaOccupe() throws Exception {
        postJson("/v1/repas", meal("2026-09-24", "SOUPER", 4, null, "Resto")).andExpect(status().isCreated());

        postJson("/v1/repas", meal("2026-09-24", "SOUPER", 4, null, "Pizza"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(containsString("2026-09-24")));
    }

    @Test
    void modificationEtSuppressionDUnRepas() throws Exception {
        String body = postJson("/v1/repas", meal("2026-09-24", "SOUPER", 4, null, "Resto"))
                .andReturn().getResponse().getContentAsString();
        long id = Long.parseLong(body.replaceAll("^\\{\"id\":(\\d+).*", "$1"));

        mvc.perform(put("/v1/repas/{id}", id).contentType(MediaType.APPLICATION_JSON)
                        .content(meal("2026-09-25", "MIDI", 2, null, "Pique-nique")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-09-25"))
                .andExpect(jsonPath("$.titre").value("Pique-nique"));
        mvc.perform(delete("/v1/repas/{id}", id)).andExpect(status().isNoContent());
        mvc.perform(get("/v1/repas/{id}", id)).andExpect(status().isNotFound());
    }

    @Test
    void suppressionDUneRecetteGardeLesRepas() throws Exception {
        long recette = createRecipe();
        postJson("/v1/repas", meal("2026-09-24", "SOUPER", 4, recette, null)).andExpect(status().isCreated());

        mvc.perform(delete("/v1/recettes/{id}", recette)).andExpect(status().isNoContent());

        mvc.perform(get("/v1/repas").param("dateDebut", "2026-09-24").param("dateFin", "2026-09-24"))
                .andExpect(jsonPath("$[0].recetteId").isEmpty())
                .andExpect(jsonPath("$[0].libelle").value("Spaghetti bolognaise"));
    }

    @Test
    void plageDeRepasInvalide() throws Exception {
        mvc.perform(get("/v1/repas").param("dateDebut", "2026-09-27").param("dateFin", "2026-09-21"))
                .andExpect(status().isBadRequest());
    }
}
