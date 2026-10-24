package com.family.agenda.security;

import com.family.agenda.dto.AccountUpdateRequest;
import com.family.agenda.entity.AccountRole;
import com.family.agenda.entity.UserAccount;
import com.family.agenda.service.AccountService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Connexion, blocage, CSRF, « rester connecté », mot de passe à changer (H2, horloge simulée, tests annulés). */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
@Transactional
class AuthApiTest {

    static class MutableClock extends Clock {
        volatile Instant instant = Instant.parse("2026-09-21T08:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.ofHours(2); }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return instant; }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }
    }

    @TestConfiguration
    static class ClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock();
        }
    }

    private static final String MOT_DE_PASSE = "mot-de-passe-test-1";

    @Autowired MockMvc mvc;
    @Autowired MutableClock clock;
    @Autowired AccountService accountService;

    private UserAccount papa;

    @BeforeEach
    void setUp() {
        clock.instant = Instant.parse("2026-09-21T08:00:00Z");
        papa = accountService.newAccount("papa", AccountRole.PARENT, null, MOT_DE_PASSE, false);
    }

    @Test
    void connexionReussieOuvreUneSessionAvecUnNouvelIdentifiant() throws Exception {
        MockHttpSession anonymous = new MockHttpSession();
        String before = anonymous.getId();

        MvcResult result = mvc.perform(post("/v1/auth/login").session(anonymous).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"identifiant\": \"PAPA\", \"motDePasse\": \"" + MOT_DE_PASSE + "\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identifiant").value("papa"))
                .andExpect(jsonPath("$.role").value("PARENT"))
                .andReturn();

        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session.getId()).isNotEqualTo(before);
        assertThat(result.getResponse().getCookie("XSRF-TOKEN")).isNotNull();
        mvc.perform(get("/v1/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.identifiant").value("papa"));
        mvc.perform(get("/v1/membres").session(session)).andExpect(status().isOk());
    }

    @Test
    void connexionRefuseeAvecLaMemeReponseQueLIdentifiantExisteOuNon() throws Exception {
        String mauvais = Logins.attempt(mvc, "papa", "mauvais-mdp-1", false)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("IDENTIFIANTS_INVALIDES"))
                .andReturn().getResponse().getContentAsString();
        String inconnu = Logins.attempt(mvc, "personne", "mauvais-mdp-1", false)
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(inconnu).isEqualTo(mauvais);
        mvc.perform(get("/v1/auth/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("NON_CONNECTE"));
    }

    @Test
    void blocageApresCinqEchecsPuisDeblocageApresQuinzeMinutes() throws Exception {
        for (int i = 0; i < 4; i++) {
            Logins.attempt(mvc, "papa", "mauvais-mdp-1", false).andExpect(jsonPath("$.code").value("IDENTIFIANTS_INVALIDES"));
        }
        Logins.attempt(mvc, "papa", "mauvais-mdp-1", false)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMPTE_BLOQUE"))
                .andExpect(jsonPath("$.bloqueJusqua").value("2026-09-21T10:15"));
        // même le bon mot de passe est refusé pendant le blocage
        Logins.attempt(mvc, "papa", MOT_DE_PASSE, false).andExpect(jsonPath("$.code").value("COMPTE_BLOQUE"));

        clock.advance(Duration.ofMinutes(14));
        Logins.attempt(mvc, "papa", MOT_DE_PASSE, false).andExpect(jsonPath("$.code").value("COMPTE_BLOQUE"));
        clock.advance(Duration.ofMinutes(2));
        Logins.attempt(mvc, "papa", MOT_DE_PASSE, false).andExpect(status().isOk());
    }

    @Test
    void identifiantInconnuBloqueAussiPourNePasTrahirLesComptes() throws Exception {
        for (int i = 0; i < 4; i++) {
            Logins.attempt(mvc, "fantome", "mauvais-mdp-1", false).andExpect(jsonPath("$.code").value("IDENTIFIANTS_INVALIDES"));
        }
        Logins.attempt(mvc, "fantome", "mauvais-mdp-1", false).andExpect(jsonPath("$.code").value("COMPTE_BLOQUE"));
    }

    @Test
    void compteDesactiveRefuse() throws Exception {
        UserAccount mamie = accountService.newAccount("mamie", AccountRole.PARENT, null, MOT_DE_PASSE, false);
        accountService.update(mamie.getId(), new AccountUpdateRequest(AccountRole.PARENT, null, false), papa.getId());

        Logins.attempt(mvc, "mamie", MOT_DE_PASSE, false)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMPTE_DESACTIVE"));
    }

    @Test
    void sessionFermeeQuandLeCompteEstDesactive() throws Exception {
        UserAccount mamie = accountService.newAccount("mamie", AccountRole.PARENT, null, MOT_DE_PASSE, false);
        MockHttpSession session = Logins.session(mvc, "mamie", MOT_DE_PASSE);

        accountService.update(mamie.getId(), new AccountUpdateRequest(AccountRole.PARENT, null, false), papa.getId());

        mvc.perform(get("/v1/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void ecritureSansJetonCsrfRefusee() throws Exception {
        MockHttpSession session = Logins.session(mvc, "papa", MOT_DE_PASSE);

        mvc.perform(post("/v1/membres").session(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nom\": \"Léa\", \"couleur\": \"#E91E63\" }"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALIDE"));
        mvc.perform(post("/v1/membres").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nom\": \"Léa\", \"couleur\": \"#E91E63\" }"))
                .andExpect(status().isCreated());
    }

    @Test
    void resterConnecteFonctionneSansSession() throws Exception {
        Cookie rememberMe = Logins.attempt(mvc, "papa", MOT_DE_PASSE, true).andReturn().getResponse().getCookie("remember-me");

        assertThat(rememberMe).isNotNull();
        assertThat(rememberMe.getMaxAge()).isEqualTo((int) Duration.ofDays(30).toSeconds());
        assertThat(rememberMe.isHttpOnly()).isTrue();
        mvc.perform(get("/v1/auth/me").cookie(rememberMe)).andExpect(status().isOk()).andExpect(jsonPath("$.identifiant").value("papa"));
    }

    @Test
    void sansResterConnectePasDeCookie() throws Exception {
        assertThat(Logins.attempt(mvc, "papa", MOT_DE_PASSE, false).andReturn().getResponse().getCookie("remember-me")).isNull();
    }

    @Test
    void resterConnecteRevoqueApresChangementDeMotDePasse() throws Exception {
        Cookie autreAppareil = Logins.attempt(mvc, "papa", MOT_DE_PASSE, true).andReturn().getResponse().getCookie("remember-me");
        MockHttpSession autreSession = Logins.session(mvc, "papa", MOT_DE_PASSE);
        MockHttpSession session = Logins.session(mvc, "papa", MOT_DE_PASSE);

        mvc.perform(post("/v1/auth/password").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"ancienMotDePasse\": \"" + MOT_DE_PASSE + "\", \"nouveauMotDePasse\": \"nouveau-mdp-test-2\" }"))
                .andExpect(status().isOk());

        mvc.perform(get("/v1/auth/me").cookie(autreAppareil)).andExpect(status().isUnauthorized());
        mvc.perform(get("/v1/auth/me").session(autreSession)).andExpect(status().isUnauthorized());
        // la session qui a changé le mot de passe reste ouverte
        mvc.perform(get("/v1/auth/me").session(session)).andExpect(status().isOk());
        Logins.attempt(mvc, "papa", "nouveau-mdp-test-2", false).andExpect(status().isOk());
    }

    @Test
    void resterConnecteRevoqueApresDeconnexion() throws Exception {
        MvcResult login = Logins.attempt(mvc, "papa", MOT_DE_PASSE, true).andReturn();
        Cookie rememberMe = login.getResponse().getCookie("remember-me");
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

        mvc.perform(post("/v1/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());

        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/v1/auth/me").cookie(rememberMe)).andExpect(status().isUnauthorized());
    }

    @Test
    void resterConnecteRevoqueApresReinitialisationParUnParent() throws Exception {
        UserAccount lea = accountService.newAccount("mamie", AccountRole.PARENT, null, MOT_DE_PASSE, false);
        Cookie rememberMe = Logins.attempt(mvc, "mamie", MOT_DE_PASSE, true).andReturn().getResponse().getCookie("remember-me");

        accountService.resetPassword(lea.getId(), "reinitialise-1");

        mvc.perform(get("/v1/auth/me").cookie(rememberMe)).andExpect(status().isUnauthorized());
    }

    @Test
    void motDePasseAChangerBloqueToutLeReste() throws Exception {
        accountService.newAccount("tonton", AccountRole.PARENT, null, MOT_DE_PASSE, true);
        MockHttpSession session = Logins.session(mvc, "tonton", MOT_DE_PASSE);

        mvc.perform(get("/v1/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.doitChangerMotDePasse").value(true));
        mvc.perform(get("/v1/membres").session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MOT_DE_PASSE_A_CHANGER"));
        mvc.perform(post("/v1/membres").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nom\": \"Léa\", \"couleur\": \"#E91E63\" }"))
                .andExpect(jsonPath("$.code").value("MOT_DE_PASSE_A_CHANGER"));

        mvc.perform(post("/v1/auth/password").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"ancienMotDePasse\": \"" + MOT_DE_PASSE + "\", \"nouveauMotDePasse\": \"nouveau-mdp-test-2\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.doitChangerMotDePasse").value(false));
        mvc.perform(get("/v1/membres").session(session)).andExpect(status().isOk());
    }

    @Test
    void changementDeMotDePasseExigeLAncien() throws Exception {
        MockHttpSession session = Logins.session(mvc, "papa", MOT_DE_PASSE);

        mvc.perform(post("/v1/auth/password").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"ancienMotDePasse\": \"mauvais-mdp-1\", \"nouveauMotDePasse\": \"nouveau-mdp-test-2\" }"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/v1/auth/password").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"ancienMotDePasse\": \"" + MOT_DE_PASSE + "\", \"nouveauMotDePasse\": \"court\" }"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void comptesReservesAuxParents() throws Exception {
        MockHttpSession session = Logins.session(mvc, "papa", MOT_DE_PASSE);

        mvc.perform(post("/v1/comptes").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"identifiant\": \"oncle\", \"role\": \"PARENT\", \"motDePasse\": \"initial-mdp-1\" }"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.actif").value(true))
                .andExpect(jsonPath("$.doitChangerMotDePasse").value(true))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        mvc.perform(get("/v1/comptes").session(session)).andExpect(status().isOk());
    }
}
