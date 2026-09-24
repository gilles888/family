package com.family.agenda.service;

import com.family.agenda.dto.IngredientDTO;
import com.family.agenda.entity.Ingredient;
import com.family.agenda.mapper.IngredientMapper;
import com.family.agenda.repository.IngredientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Ingrédients partagés entre recettes : recherche (autocomplétion) et création à la volée. */
@Service
@RequiredArgsConstructor
@Transactional
public class IngredientService {

    public static final int LIMITE_MAX = 50;

    private final IngredientRepository repository;
    private final IngredientMapper mapper;

    /** Ingrédients dont le nom contient {@code q} (sans tenir compte de la casse ni des accents), par ordre alphabétique. */
    @Transactional(readOnly = true)
    public List<IngredientDTO> search(String q, int limit) {
        return repository.findByNomNormaliseContainingOrderByNomAsc(normaliser(q == null ? "" : q),
                        Limit.of(Math.clamp(limit, 1, LIMITE_MAX)))
                .stream().map(mapper::toDto).toList();
    }

    /**
     * Ingrédients correspondant aux noms donnés, créés s'ils n'existent pas encore, indexés par nom normalisé.
     * Un ingrédient existant garde son nom d'origine.
     */
    Map<String, Ingredient> resolveOrCreate(Collection<String> noms) {
        Map<String, String> parNomNormalise = new LinkedHashMap<>();
        noms.forEach(nom -> parNomNormalise.putIfAbsent(normaliser(nom), nettoyer(nom)));

        Map<String, Ingredient> resultat = repository.findByNomNormaliseIn(parNomNormalise.keySet()).stream()
                .collect(Collectors.toMap(Ingredient::getNomNormalise, Function.identity()));
        parNomNormalise.forEach((normalise, nom) ->
                resultat.computeIfAbsent(normalise, n -> repository.save(new Ingredient(nom, n))));
        return resultat;
    }

    /** Nom affiché : espaces de début/fin retirés, espaces multiples réduits. */
    static String nettoyer(String nom) {
        return nom.strip().replaceAll("\\s+", " ");
    }

    /** Clé d'unicité : nom nettoyé, en minuscules, sans accents (« Crème  Fraîche » → « creme fraiche »). */
    static String normaliser(String nom) {
        return Normalizer.normalize(nettoyer(nom), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
