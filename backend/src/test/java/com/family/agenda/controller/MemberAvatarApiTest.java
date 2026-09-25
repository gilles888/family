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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Personnage (avatar) d'un membre : PUT /v1/membres/{id}/avatar (H2, chaque test annulé en fin d'exécution). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
@Transactional
class MemberAvatarApiTest {

    private static final String AVATAR = """
            { "version": 1, "skin": "skin-3", "eyes": "eyes-happy", "mouth": "mouth-smile", "hair": "hair-curly",
              "hairColor": "#6b3e26", "outfit": "hoodie", "outfitColor": "#3b82f6", "hat": "crown",
              "accessory": "none", "background": "#fde68a" }""";

    @Autowired MockMvc mvc;

    private long lea;

    @BeforeEach
    void setUp() throws Exception {
        String body = mvc.perform(post("/v1/membres").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nom\": \"Léa\", \"couleur\": \"#E91E63\" }"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        lea = Long.parseLong(body.replaceAll("^\\{\"id\":(\\d+).*", "$1"));
    }

    private ResultActions putAvatar(long id, String json) throws Exception {
        return mvc.perform(put("/v1/membres/{id}/avatar", id).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void sansAvatarParDefaut() throws Exception {
        mvc.perform(get("/v1/membres/{id}", lea))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfig").doesNotExist());
    }

    @Test
    void enregistreEtRenvoieLAvatarAvecLeMembre() throws Exception {
        putAvatar(lea, AVATAR)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Léa"))
                .andExpect(jsonPath("$.avatarConfig.version").value(1))
                .andExpect(jsonPath("$.avatarConfig.hat").value("crown"));

        mvc.perform(get("/v1/membres"))
                .andExpect(jsonPath("$[0].avatarConfig.hair").value("hair-curly"))
                .andExpect(jsonPath("$[0].avatarConfig.hairColor").value("#6b3e26"));
    }

    @Test
    void modifierLeMembreGardeSonAvatar() throws Exception {
        putAvatar(lea, AVATAR).andExpect(status().isOk());

        mvc.perform(put("/v1/membres/{id}", lea).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nom\": \"Léa B.\", \"couleur\": \"#E91E63\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfig.hat").value("crown"));
    }

    @Test
    void nullRevientALAvatarParDefaut() throws Exception {
        putAvatar(lea, AVATAR).andExpect(status().isOk());

        putAvatar(lea, "null")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfig").doesNotExist());
    }

    @Test
    void refusSiPasUnObjetJsonOuTropLong() throws Exception {
        putAvatar(lea, "{ pas du json").andExpect(status().isBadRequest());
        putAvatar(lea, "[1, 2]").andExpect(status().isBadRequest());
        putAvatar(lea, "{ \"x\": \"" + "a".repeat(2100) + "\" }").andExpect(status().isBadRequest());
    }

    @Test
    void membreIntrouvable() throws Exception {
        putAvatar(999_999, AVATAR).andExpect(status().isNotFound());
    }
}
