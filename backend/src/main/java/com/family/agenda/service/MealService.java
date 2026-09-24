package com.family.agenda.service;

import com.family.agenda.dto.MealDTO;
import com.family.agenda.dto.MealRequest;
import com.family.agenda.entity.Meal;
import com.family.agenda.entity.Recipe;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ConflictException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.mapper.MealMapper;
import com.family.agenda.repository.MealRepository;
import com.family.agenda.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/** Planification des repas : une recette type OU un libellé libre par repas, un repas par (date, créneau). */
@Service
@RequiredArgsConstructor
@Transactional
public class MealService {

    /** Plage maximale d'une consultation (jours inclus). */
    public static final int JOURS_MAX = 366;

    private final MealRepository repository;
    private final RecipeRepository recipeRepository;
    private final MealMapper mapper;

    /** Repas de la plage (jours inclus), par date puis créneau. */
    @Transactional(readOnly = true)
    public List<MealDTO> findBetween(LocalDate debut, LocalDate fin) {
        if (fin.isBefore(debut)) {
            throw new BusinessRuleException("dateFin doit être postérieure ou égale à dateDebut");
        }
        if (ChronoUnit.DAYS.between(debut, fin) >= JOURS_MAX) {
            throw new BusinessRuleException("La plage ne peut pas dépasser " + JOURS_MAX + " jours");
        }
        return repository.findByDateBetween(debut, fin).stream()
                .sorted(Comparator.comparing(Meal::getDate).thenComparing(Meal::getCreneau))
                .map(mapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public MealDTO findById(Long id) {
        return mapper.toDto(load(id));
    }

    public MealDTO create(MealRequest request) {
        if (repository.existsByDateAndCreneau(request.date(), request.creneau())) {
            throw creneauOccupe(request);
        }
        Meal meal = new Meal();
        apply(request, meal);
        return mapper.toDto(repository.save(meal));
    }

    public MealDTO update(Long id, MealRequest request) {
        Meal meal = load(id);
        if (repository.existsByDateAndCreneauAndIdNot(request.date(), request.creneau(), id)) {
            throw creneauOccupe(request);
        }
        apply(request, meal);
        return mapper.toDto(repository.saveAndFlush(meal));
    }

    public void delete(Long id) {
        repository.delete(load(id));
    }

    /** La validation de la requête garantit déjà « recette XOR libellé » ; revérifié ici pour tout appelant. */
    private void apply(MealRequest request, Meal meal) {
        boolean avecLibelle = request.libelle() != null && !request.libelle().isBlank();
        if ((request.recetteId() != null) == avecLibelle) {
            throw new BusinessRuleException("Un repas a une recette OU un libellé libre, pas les deux ni aucun");
        }
        meal.setDate(request.date());
        meal.setCreneau(request.creneau());
        meal.setPortions(request.portions());
        meal.setRecipe(request.recetteId() == null ? null : loadRecipe(request.recetteId()));
        meal.setLibelle(avecLibelle ? request.libelle().strip() : null);
    }

    private Recipe loadRecipe(Long id) {
        return recipeRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Recette introuvable (id=%s)".formatted(id)));
    }

    private static ConflictException creneauOccupe(MealRequest request) {
        return new ConflictException("Un repas est déjà prévu le %s (%s)".formatted(request.date(), request.creneau()));
    }

    private Meal load(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Repas", id));
    }
}
