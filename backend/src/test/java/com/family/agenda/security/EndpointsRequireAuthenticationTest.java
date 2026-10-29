package com.family.agenda.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Parcourt TOUS les endpoints de l'API enregistrés et vérifie qu'ils exigent une connexion (401), sauf la liste
 * blanche. Un futur endpoint oublié dans la configuration de sécurité fait échouer le build.
 */
@SpringBootTest(properties = "agenda.seed.enabled=false")
@AutoConfigureMockMvc
class EndpointsRequireAuthenticationTest {

    /** Seuls endpoints accessibles sans connexion. */
    private static final Set<String> LISTE_BLANCHE = Set.of("POST /{version}/auth/login");

    private static final Pattern VARIABLE = Pattern.compile("\\{([^}]+)}");
    /** Valeurs plausibles des variables de chemin (la sécurité répond avant leur conversion). */
    private static final Map<String, String> VALEURS = Map.of("version", "v1", "date", "2026-09-21", "annee", "2026", "mois", "9");

    record Endpoint(HttpMethod method, String pattern) {

        String key() {
            return method.name() + " " + pattern;
        }

        String url() {
            Matcher m = VARIABLE.matcher(pattern);
            StringBuilder url = new StringBuilder();
            while (m.find()) {
                m.appendReplacement(url, VALEURS.getOrDefault(m.group(1), "1"));
            }
            return m.appendTail(url).toString();
        }
    }

    @Autowired MockMvc mvc;
    @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping mapping;

    private List<Endpoint> apiEndpoints() {
        List<Endpoint> endpoints = new ArrayList<>();
        for (RequestMappingInfo info : mapping.getHandlerMethods().keySet()) {
            Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
            for (String pattern : info.getPatternValues()) {
                if (!pattern.startsWith("/{version}/")) {
                    continue;
                }
                if (methods.isEmpty()) {
                    endpoints.add(new Endpoint(HttpMethod.GET, pattern));
                }
                methods.forEach(m -> endpoints.add(new Endpoint(HttpMethod.valueOf(m.name()), pattern)));
            }
        }
        return endpoints;
    }

    @Test
    void tousLesEndpointsExigentUneConnexion() throws Exception {
        List<Endpoint> endpoints = apiEndpoints();
        assertThat(endpoints).hasSizeGreaterThan(50)
                .extracting(Endpoint::key).contains("GET /{version}/comptes", "POST /{version}/auth/logout", "GET /{version}/parametres/theme",
                        "GET /{version}/boutique/catalogue", "POST /{version}/membres/{memberId}/boutique/achats",
                        "POST /{version}/membres/{memberId}/porte-monnaie/echange", "PUT /{version}/membres/{memberId}/tenues/{theme}");

        List<String> ouverts = new ArrayList<>();
        for (Endpoint endpoint : endpoints) {
            if (LISTE_BLANCHE.contains(endpoint.key())) {
                continue;
            }
            // Avec un jeton CSRF valide : seul le contrôle de connexion peut répondre
            int status = mvc.perform(request(endpoint.method(), endpoint.url()).with(csrf())).andReturn().getResponse().getStatus();
            if (status != 401) {
                ouverts.add(endpoint.key() + " → " + status);
            }
        }
        assertThat(ouverts).as("endpoints accessibles sans connexion").isEmpty();
    }

    @Test
    void listeBlancheAccessibleSansConnexion() throws Exception {
        for (Endpoint endpoint : apiEndpoints()) {
            if (LISTE_BLANCHE.contains(endpoint.key())) {
                // corps absent : 400 (validation), et non 401
                int status = mvc.perform(request(endpoint.method(), endpoint.url()).with(csrf())).andReturn().getResponse().getStatus();
                assertThat(status).as(endpoint.key()).isNotEqualTo(401).isNotEqualTo(403);
            }
        }
    }
}
