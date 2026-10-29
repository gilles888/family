package com.family.agenda.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.family.agenda.dto.ArticleDTO;
import com.family.agenda.entity.Saison;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Catalogue de la boutique, lu une fois dans {@code boutique/catalogue.json} : source de vérité des prix. Le front
 * garde les dessins (un test de cohérence côté front vérifie que les deux fichiers concordent).
 */
@Component
public class CatalogueService {

    public static final String RESSOURCE = "boutique/catalogue.json";

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Fichier(Map<String, Integer> bareme, List<Entree> articles) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Entree(String id, String emplacement, String rarete, Integer prix, Saison theme) {
    }

    private final Map<String, ArticleDTO> articles = new LinkedHashMap<>();

    public CatalogueService(JsonMapper jsonMapper) throws IOException {
        try (InputStream in = new ClassPathResource(RESSOURCE).getInputStream()) {
            Fichier fichier = jsonMapper.readValue(in, Fichier.class);
            for (Entree e : fichier.articles()) {
                int prix = e.prix() != null ? e.prix() : bareme(fichier, e);
                if (prix < 0 || articles.put(e.id(), new ArticleDTO(e.id(), e.emplacement(), prix, e.rarete(), e.theme())) != null) {
                    throw new IllegalStateException("Catalogue invalide (prix négatif ou id en double) : " + e.id());
                }
            }
        }
    }

    private static int bareme(Fichier fichier, Entree e) {
        Integer prix = fichier.bareme() == null ? null : fichier.bareme().get(e.rarete());
        if (prix == null) {
            throw new IllegalStateException("Pas de prix ni de barème pour l'article " + e.id() + " (rareté " + e.rarete() + ")");
        }
        return prix;
    }

    public List<ArticleDTO> all() {
        return List.copyOf(articles.values());
    }

    public Optional<ArticleDTO> find(String id) {
        return Optional.ofNullable(articles.get(id));
    }
}
