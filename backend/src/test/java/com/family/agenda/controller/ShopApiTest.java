package com.family.agenda.controller;

import com.family.agenda.entity.Routine;
import com.family.agenda.entity.RoutineRun;
import com.family.agenda.repository.RoutineRepository;
import com.family.agenda.repository.RoutineRunRepository;
import com.family.agenda.service.RoutineService;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Boutique : échange étoiles → pièces, achats, cadeaux, remboursements, personnage et tenues de thème
 * (H2, chaque test annulé en fin d'exécution). Les prix viennent de boutique/catalogue.json : costume-witch = 5 pièces,
 * hat-witch = 1 pièce, costume-ghost = 5 pièces.
 */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
@Import(ParentMockMvc.class)
@Transactional
class ShopApiTest {

    @Autowired MockMvc mvc;
    @Autowired RoutineService routineService;
    @Autowired RoutineRepository routineRepository;
    @Autowired RoutineRunRepository runRepository;
    @Autowired Clock clock;

    private long tom;
    private Routine routine;
    private int joursGagnes;

    @BeforeEach
    void setUp() throws Exception {
        String body = mvc.perform(post("/v1/membres").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nom\": \"Tom\", \"couleur\": \"#4CAF50\" }"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        tom = Long.parseLong(body.replaceAll("^\\{\"id\":(\\d+).*", "$1"));
        Long routineId = routineService.applyTemplate(tom, "matin", "fr", EnumSet.allOf(DayOfWeek.class), null, null).id();
        routine = routineRepository.findById(routineId).orElseThrow();
    }

    /** Termine la routine sur {@code n} jours consécutifs : n étoiles gagnées. */
    private void gagner(int n) {
        LocalDate today = LocalDate.now(clock);
        for (int i = 0; i < n; i++) {
            RoutineRun run = new RoutineRun(routine, today.minusDays(joursGagnes++));
            run.setCompletedAt(LocalDateTime.now(clock));
            runRepository.save(run);
        }
    }

    private ResultActions json(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String body) throws Exception {
        return mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions echanger(int pieces) throws Exception {
        return json(post("/v1/membres/{id}/porte-monnaie/echange", tom), "{ \"pieces\": " + pieces + " }");
    }

    private ResultActions acheter(String article) throws Exception {
        return json(post("/v1/membres/{id}/boutique/achats", tom), "{ \"articleId\": \"" + article + "\" }");
    }

    private void donnerDesPieces(int pieces) throws Exception {
        json(post("/v1/membres/{id}/porte-monnaie/ajustements", tom), "{ \"pieces\": " + pieces + ", \"commentaire\": \"test\" }").andExpect(status().isOk());
    }

    private void taux(int etoilesParPiece) throws Exception {
        json(put("/v1/parametres/boutique"), "{ \"etoilesParPiece\": " + etoilesParPiece + " }").andExpect(status().isOk());
    }

    private ResultActions avatar(String config) throws Exception {
        return json(put("/v1/membres/{id}/avatar", tom), config);
    }

    @Test
    void catalogueAvecPrixEtArticlesGratuits() throws Exception {
        mvc.perform(get("/v1/boutique/catalogue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThan(100)))
                .andExpect(jsonPath("$[?(@.id=='costume-witch')].prix").value(5))
                .andExpect(jsonPath("$[?(@.id=='costume-witch')].theme").value("HALLOWEEN"))
                .andExpect(jsonPath("$[?(@.id=='hat-crown')].prix").value(0));
    }

    @Test
    void porteMonnaieInitialVide() throws Exception {
        mvc.perform(get("/v1/membres/{id}/porte-monnaie", tom))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pieces").value(0))
                .andExpect(jsonPath("$.etoilesDisponibles").value(0))
                .andExpect(jsonPath("$.etoilesParPiece").value(10));
    }

    @Test
    void echangeAvecAssezDEtoiles() throws Exception {
        gagner(25);
        echanger(2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pieces").value(2))
                .andExpect(jsonPath("$.etoilesDisponibles").value(5))
                .andExpect(jsonPath("$.etoilesConverties").value(20));
        mvc.perform(get("/v1/membres/{id}/etoiles", tom))
                .andExpect(jsonPath("$.gagnees").value(25))
                .andExpect(jsonPath("$.converties").value(20))
                .andExpect(jsonPath("$.solde").value(5));
        mvc.perform(get("/v1/membres/{id}/transactions", tom))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].type").value("ECHANGE"))
                .andExpect(jsonPath("$[0].pieces").value(2))
                .andExpect(jsonPath("$[0].etoiles").value(20));
    }

    @Test
    void echangeSansAssezDEtoiles() throws Exception {
        gagner(9);
        echanger(1).andExpect(status().isBadRequest());
        gagner(10);
        echanger(2).andExpect(status().isBadRequest());
        echanger(1).andExpect(status().isOk());
        echanger(0).andExpect(status().isBadRequest());
    }

    @Test
    void tauxModifie() throws Exception {
        gagner(7);
        taux(3);
        echanger(2).andExpect(status().isOk()).andExpect(jsonPath("$.etoilesDisponibles").value(1)).andExpect(jsonPath("$.etoilesParPiece").value(3));
        // le nouveau taux ne touche pas ce qui est déjà échangé
        taux(1);
        mvc.perform(get("/v1/membres/{id}/porte-monnaie", tom)).andExpect(jsonPath("$.etoilesConverties").value(6)).andExpect(jsonPath("$.etoilesDisponibles").value(1));
    }

    @Test
    void retraitApresEchangeLaissePiecesIntactesEtSoldeAZero() throws Exception {
        gagner(12);
        echanger(1).andExpect(status().isOk());
        json(post("/v1/membres/{id}/etoiles/retraits", tom), "{ \"nombre\": 5, \"motif\": \"DISPUTE\" }").andExpect(status().isCreated());
        mvc.perform(get("/v1/membres/{id}/porte-monnaie", tom))
                .andExpect(jsonPath("$.pieces").value(1))
                .andExpect(jsonPath("$.etoilesDisponibles").value(0));
        mvc.perform(get("/v1/membres/{id}/etoiles", tom)).andExpect(jsonPath("$.solde").value(0));
        echanger(1).andExpect(status().isBadRequest());
    }

    @Test
    void achatEtErreurs() throws Exception {
        donnerDesPieces(6);
        acheter("costume-witch")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pieces").value(1));
        mvc.perform(get("/v1/membres/{id}/articles", tom))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].articleId").value("costume-witch"))
                .andExpect(jsonPath("$[0].prixPaye").value(5));
        acheter("costume-witch").andExpect(status().isConflict());
        acheter("costume-ghost").andExpect(status().isBadRequest());
        acheter("hat-crown").andExpect(status().isBadRequest());
        acheter("article-inconnu").andExpect(status().isNotFound());
        mvc.perform(get("/v1/membres/{id}/transactions", tom))
                .andExpect(jsonPath("$[0].type").value("ACHAT"))
                .andExpect(jsonPath("$[0].pieces").value(-5))
                .andExpect(jsonPath("$[0].articleId").value("costume-witch"));
    }

    @Test
    void cadeauSansPayer() throws Exception {
        json(post("/v1/membres/{id}/boutique/cadeaux", tom), "{ \"articleId\": \"costume-ghost\" }")
                .andExpect(status().isOk()).andExpect(jsonPath("$.pieces").value(0));
        json(post("/v1/membres/{id}/boutique/cadeaux", tom), "{ \"articleId\": \"costume-ghost\" }").andExpect(status().isConflict());
        mvc.perform(get("/v1/membres/{id}/articles", tom)).andExpect(jsonPath("$[0].prixPaye").value(0));
        avatar("{ \"version\": 2, \"costume\": \"costume-ghost\" }").andExpect(status().isOk());
    }

    @Test
    void ajustementExigeUnMotifEtNeRendJamaisNegatif() throws Exception {
        json(post("/v1/membres/{id}/porte-monnaie/ajustements", tom), "{ \"pieces\": 2, \"commentaire\": \"\" }").andExpect(status().isBadRequest());
        json(post("/v1/membres/{id}/porte-monnaie/ajustements", tom), "{ \"pieces\": 0, \"commentaire\": \"x\" }").andExpect(status().isBadRequest());
        donnerDesPieces(2);
        json(post("/v1/membres/{id}/porte-monnaie/ajustements", tom), "{ \"pieces\": -3, \"commentaire\": \"trop\" }").andExpect(status().isBadRequest());
        json(post("/v1/membres/{id}/porte-monnaie/ajustements", tom), "{ \"pieces\": -2, \"commentaire\": \"erreur\" }")
                .andExpect(status().isOk()).andExpect(jsonPath("$.pieces").value(0));
    }

    @Test
    void personnageAvecArticlePayantNonPossedeRefuse() throws Exception {
        avatar("{ \"version\": 2, \"hat\": \"hat-witch\", \"hair\": \"hair-short\" }")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("hat-witch")));
        // gratuit, id inconnu et couleur : acceptés
        avatar("{ \"version\": 2, \"hat\": \"hat-crown\", \"face\": \"face-freckles\", \"costume\": \"costume-retire\", \"hairColor\": \"#6b3e26\" }")
                .andExpect(status().isOk());
        donnerDesPieces(1);
        acheter("hat-witch").andExpect(status().isOk());
        avatar("{ \"version\": 2, \"hat\": \"hat-witch\" }").andExpect(status().isOk()).andExpect(jsonPath("$.avatarConfig.hat").value("hat-witch"));
    }

    @Test
    void remboursementDUnArticlePorte() throws Exception {
        donnerDesPieces(5);
        acheter("costume-witch").andExpect(status().isOk()).andExpect(jsonPath("$.pieces").value(0));
        avatar("{ \"version\": 2, \"costume\": \"costume-witch\", \"hat\": \"hat-crown\" }").andExpect(status().isOk());
        json(put("/v1/membres/{id}/tenues/HALLOWEEN", tom), "{ \"version\": 2, \"costume\": \"costume-witch\" }").andExpect(status().isOk());

        json(post("/v1/membres/{id}/boutique/remboursements", tom), "{ \"articleId\": \"costume-witch\", \"commentaire\": \"erreur\" }")
                .andExpect(status().isOk()).andExpect(jsonPath("$.pieces").value(5));
        mvc.perform(get("/v1/membres/{id}", tom))
                .andExpect(jsonPath("$.avatarConfig.costume").value("none"))
                .andExpect(jsonPath("$.avatarConfig.hat").value("hat-crown"))
                .andExpect(jsonPath("$.tenues.HALLOWEEN.costume").value("none"));
        mvc.perform(get("/v1/membres/{id}/articles", tom)).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/v1/membres/{id}/transactions", tom)).andExpect(jsonPath("$[0].type").value("REMBOURSEMENT"));
        json(post("/v1/membres/{id}/boutique/remboursements", tom), "{ \"articleId\": \"costume-witch\" }").andExpect(status().isNotFound());
    }

    @Test
    void remboursementRemetLaPieceParDefautDeLEmplacement() throws Exception {
        json(post("/v1/membres/{id}/boutique/cadeaux", tom), "{ \"articleId\": \"hair-spikes\" }").andExpect(status().isOk());
        avatar("{ \"version\": 2, \"hair\": \"hair-spikes\" }").andExpect(status().isOk());
        json(post("/v1/membres/{id}/boutique/remboursements", tom), "{ \"articleId\": \"hair-spikes\" }").andExpect(status().isOk());
        mvc.perform(get("/v1/membres/{id}", tom)).andExpect(jsonPath("$.avatarConfig.hair").value("hair-short"));
    }

    @Test
    void tenuesDeThemeEtPortAutomatique() throws Exception {
        mvc.perform(get("/v1/membres/{id}", tom)).andExpect(jsonPath("$.tenueAuto").value(true)).andExpect(jsonPath("$.tenues").doesNotExist());
        json(put("/v1/membres/{id}/tenues/HALLOWEEN", tom), "{ \"version\": 2, \"costume\": \"costume-witch\" }")
                .andExpect(status().isBadRequest());
        json(put("/v1/membres/{id}/tenues/HALLOWEEN", tom), "{ \"version\": 2, \"costume\": \"none\", \"face\": \"face-freckles\" }")
                .andExpect(status().isOk()).andExpect(jsonPath("$.HALLOWEEN.face").value("face-freckles"));
        json(put("/v1/membres/{id}/tenues/HALLOWEEN", tom), "{}").andExpect(status().isBadRequest());
        json(put("/v1/membres/{id}/tenues/NIMPORTEQUOI", tom), "{ \"version\": 2 }").andExpect(status().isBadRequest());
        mvc.perform(get("/v1/membres")).andExpect(jsonPath("$[0].tenues.HALLOWEEN.face").value("face-freckles"));

        json(put("/v1/membres/{id}/tenues/auto", tom), "{ \"actif\": false }").andExpect(status().isNoContent());
        mvc.perform(get("/v1/membres/{id}", tom)).andExpect(jsonPath("$.tenueAuto").value(false));

        mvc.perform(delete("/v1/membres/{id}/tenues/HALLOWEEN", tom)).andExpect(status().isOk()).andExpect(jsonPath("$.HALLOWEEN").doesNotExist());
    }

    @Test
    void membreIntrouvable() throws Exception {
        mvc.perform(get("/v1/membres/{id}/porte-monnaie", 999_999)).andExpect(status().isNotFound());
        json(post("/v1/membres/{id}/boutique/achats", 999_999), "{ \"articleId\": \"costume-witch\" }").andExpect(status().isNotFound());
    }

    @Test
    void reglageDuTauxValide() throws Exception {
        json(put("/v1/parametres/boutique"), "{ \"etoilesParPiece\": 0 }").andExpect(status().isBadRequest());
        mvc.perform(get("/v1/parametres/boutique")).andExpect(jsonPath("$.etoilesParPiece").value(10));
    }
}
