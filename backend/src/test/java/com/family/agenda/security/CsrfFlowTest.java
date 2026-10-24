package com.family.agenda.security;

import com.family.agenda.entity.AccountRole;
import com.family.agenda.service.AccountService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Parcours CSRF du front avec les vrais cookies XSRF-TOKEN et en-têtes X-XSRF-TOKEN. Contexte dédié : le raccourci
 * csrf() des autres tests remplace durablement le dépôt de jetons du filtre CSRF partagé.
 */
@SpringBootTest(properties = {"agenda.seed.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:csrf-flow;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE"})
@AutoConfigureMockMvc
@Transactional
class CsrfFlowTest {

    private static final String MOT_DE_PASSE = "mot-de-passe-test-1";

    @Autowired MockMvc mvc;
    @Autowired AccountService accountService;

    private ResultActions login(Cookie xsrf) throws Exception {
        return mvc.perform(post("/v1/auth/login").cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ \"identifiant\": \"papa\", \"motDePasse\": \"" + MOT_DE_PASSE + "\" }"));
    }

    @Test
    void connexionDeconnexionPuisReconnexionDepuisLaMemePage() throws Exception {
        accountService.newAccount("papa", AccountRole.PARENT, null, MOT_DE_PASSE, false);
        // 1re visite, non connecté : le cookie XSRF-TOKEN arrive avec le 401 de /v1/auth/me
        Cookie xsrf = mvc.perform(get("/v1/auth/me")).andExpect(status().isUnauthorized())
                .andReturn().getResponse().getCookie("XSRF-TOKEN");
        assertThat(xsrf).isNotNull();

        MvcResult connected = login(xsrf).andExpect(status().isOk()).andReturn();
        Cookie afterLogin = connected.getResponse().getCookie("XSRF-TOKEN");
        assertThat(afterLogin.getValue()).as("nouveau jeton à la connexion").isNotEqualTo(xsrf.getValue());
        MockHttpSession session = (MockHttpSession) connected.getRequest().getSession(false);

        // écriture sans l'en-tête : refusée ; avec : acceptée
        mvc.perform(post("/v1/auth/logout").session(session).cookie(afterLogin)).andExpect(status().isForbidden());
        Cookie afterLogout = mvc.perform(post("/v1/auth/logout").session(session).cookie(afterLogin)
                        .header("X-XSRF-TOKEN", afterLogin.getValue()))
                .andExpect(status().isNoContent())
                .andReturn().getResponse().getCookie("XSRF-TOKEN");

        // la déconnexion émet un jeton neuf : la connexion suivante, sans recharger la page, passe
        assertThat(afterLogout.getValue()).isNotBlank().isNotEqualTo(afterLogin.getValue());
        login(afterLogout).andExpect(status().isOk());
    }
}
