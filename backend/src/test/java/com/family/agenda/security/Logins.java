package com.family.agenda.security;

import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Connexions réelles (POST /v1/auth/login), sans raccourci de test : session et cookie « rester connecté ». */
final class Logins {

    private Logins() {
    }

    static ResultActions attempt(MockMvc mvc, String identifiant, String motDePasse, boolean resterConnecte) throws Exception {
        return mvc.perform(post("/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "identifiant": "%s", "motDePasse": "%s", "resterConnecte": %s }""".formatted(identifiant, motDePasse, resterConnecte)));
    }

    /** Session ouverte par une connexion réussie. */
    static MockHttpSession session(MockMvc mvc, String identifiant, String motDePasse) throws Exception {
        MvcResult result = attempt(mvc, identifiant, motDePasse, false).andReturn();
        if (result.getResponse().getStatus() != 200) {
            throw new AssertionError("Connexion de " + identifiant + " refusée : " + result.getResponse().getContentAsString());
        }
        return (MockHttpSession) result.getRequest().getSession(false);
    }
}
