package com.family.agenda.service;

import com.family.agenda.dto.RecipeDTO;
import com.family.agenda.dto.RecipeIngredientDTO;
import com.family.agenda.dto.RecipeIngredientRequest;
import com.family.agenda.dto.RecipeRequest;
import com.family.agenda.dto.RecipeSheetDTO;
import com.family.agenda.dto.RecipeSummaryDTO;
import com.family.agenda.entity.Ingredient;
import com.family.agenda.entity.Recipe;
import com.family.agenda.entity.RecipeIngredient;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.mapper.RecipeMapper;
import com.family.agenda.repository.MealRepository;
import com.family.agenda.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Recettes types, partagées par la famille. */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class RecipeService {

    private final RecipeRepository repository;
    private final MealRepository mealRepository;
    private final IngredientService ingredientService;
    private final PortionCalculator portionCalculator;
    private final RecipeMapper mapper;

    /** Toutes les recettes par ordre alphabétique, ou celles dont le nom contient {@code q} (sans casse). */
    @Transactional(readOnly = true)
    public List<RecipeSummaryDTO> findAll(String q) {
        List<Recipe> recipes = q == null || q.isBlank()
                ? repository.findAllByOrderByNomAscIdAsc()
                : repository.findByNomContainingIgnoreCaseOrderByNomAscIdAsc(q.strip());
        return recipes.stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public RecipeDTO findById(Long id) {
        return mapper.toDto(load(id));
    }

    /** Crée la recette ; les ingrédients inconnus sont créés à la volée. */
    public RecipeDTO create(RecipeRequest request) {
        Recipe recipe = mapper.toEntity(request);
        applyIngredients(recipe, request.ingredients());
        return mapper.toDto(repository.save(recipe));
    }

    /** Remplace tous les champs et toute la liste d'ingrédients. */
    public RecipeDTO update(Long id, RecipeRequest request) {
        Recipe recipe = load(id);
        mapper.update(request, recipe);
        applyIngredients(recipe, request.ingredients());
        return mapper.toDto(repository.saveAndFlush(recipe));
    }

    /** Supprime la recette ; les repas qui l'utilisent gardent son nom comme libellé libre. */
    public void delete(Long id) {
        Recipe recipe = load(id);
        int detaches = mealRepository.detachRecipe(id, libelleLibre(recipe.getNom()));
        if (detaches > 0) {
            log.info("Recette {} supprimée : {} repas conservé(s) avec le libellé « {} »", id, detaches, recipe.getNom());
        }
        repository.deleteById(id);
    }

    /** Fiche de la recette, quantités recalculées pour {@code portions} (portions de la recette si absent). */
    @Transactional(readOnly = true)
    public RecipeSheetDTO sheet(Long id, Integer portions) {
        Recipe recipe = load(id);
        int cible = portions == null ? recipe.getPortions() : portions;
        List<RecipeIngredientDTO> ingredients = recipe.getIngredients().stream()
                .map(mapper::toDto)
                .map(line -> new RecipeIngredientDTO(line.ingredientId(), line.nom(), line.rayon(),
                        portionCalculator.proratiser(line.quantite(), recipe.getPortions(), cible), line.unite()))
                .toList();
        return new RecipeSheetDTO(recipe.getId(), recipe.getNom(), recipe.getDescription(), recipe.getPortions(), cible,
                recipe.getTempsPreparation(), recipe.getInstructions(), ingredients);
    }

    private void applyIngredients(Recipe recipe, List<RecipeIngredientRequest> lines) {
        List<RecipeIngredientRequest> demandes = lines == null ? List.of() : lines;
        Set<String> vus = new HashSet<>();
        for (RecipeIngredientRequest line : demandes) {
            if (!vus.add(IngredientService.normaliser(line.nom()))) {
                throw new BusinessRuleException("Ingrédient en double dans la recette : " + IngredientService.nettoyer(line.nom()));
            }
        }
        Map<String, Ingredient> ingredients = ingredientService.resolveOrCreate(
                demandes.stream().map(RecipeIngredientRequest::nom).toList());

        recipe.getIngredients().clear(); // orphanRemoval supprime les anciennes lignes
        for (int i = 0; i < demandes.size(); i++) {
            RecipeIngredientRequest demande = demandes.get(i);
            RecipeIngredient line = new RecipeIngredient();
            line.setRecipe(recipe);
            line.setIngredient(ingredients.get(IngredientService.normaliser(demande.nom())));
            line.setPosition(i);
            line.setQuantite(demande.quantite());
            line.setUnite(demande.unite());
            recipe.getIngredients().add(line);
        }
    }

    /** Le libellé libre d'un repas est limité à 100 caractères, le nom d'une recette à 150. */
    private static String libelleLibre(String nomRecette) {
        return nomRecette.length() <= 100 ? nomRecette : nomRecette.substring(0, 99) + "…";
    }

    private Recipe load(Long id) {
        return repository.findWithIngredientsById(id).orElseThrow(() -> new ResourceNotFoundException("Recette", id));
    }
}
