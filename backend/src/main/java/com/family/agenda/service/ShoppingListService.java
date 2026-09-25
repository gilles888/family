package com.family.agenda.service;

import com.family.agenda.dto.ShoppingItemDTO;
import com.family.agenda.dto.ShoppingItemRequest;
import com.family.agenda.dto.ShoppingItemStatusRequest;
import com.family.agenda.dto.ShoppingListDTO;
import com.family.agenda.entity.Ingredient;
import com.family.agenda.entity.PantryItem;
import com.family.agenda.entity.ShoppingItem;
import com.family.agenda.entity.ShoppingItemOrigin;
import com.family.agenda.entity.ShoppingList;
import com.family.agenda.exception.BusinessRuleException;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.mapper.ShoppingMapper;
import com.family.agenda.repository.IngredientRepository;
import com.family.agenda.repository.MealRepository;
import com.family.agenda.repository.PantryItemRepository;
import com.family.agenda.repository.ShoppingItemRepository;
import com.family.agenda.repository.ShoppingListRepository;
import com.family.agenda.service.ShoppingListAggregator.AggregatedLine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Liste de courses de la famille (une seule). Les lignes générées viennent des repas planifiés (voir
 * {@link ShoppingListAggregator}) ; les articles manuels ne sont jamais touchés par la régénération.
 * <p>
 * Une ligne générée supprimée, ou vidée après achat, n'est pas effacée mais « retirée » : sinon la régénération
 * suivante la ferait revenir comme à acheter. Elle disparaît pour de bon quand plus aucun repas n'en a besoin.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ShoppingListService {

    /** Période maximale d'une génération (jours inclus). */
    public static final int JOURS_MAX = 62;

    private final ShoppingItemRepository itemRepository;
    private final ShoppingListRepository listRepository;
    private final PantryItemRepository pantryRepository;
    private final MealRepository mealRepository;
    private final IngredientRepository ingredientRepository;
    private final ShoppingListAggregator aggregator;
    private final ShoppingMapper mapper;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ShoppingListDTO get() {
        List<ShoppingItemDTO> articles = itemRepository.findByRetireFalseOrderByNomAsc().stream()
                .map(mapper::toDto).toList();
        return listRepository.findById(ShoppingList.ID)
                .map(list -> new ShoppingListDTO(list.getDateDebut(), list.getDateFin(), list.getGenereLe(), articles))
                .orElseGet(() -> new ShoppingListDTO(null, null, null, articles));
    }

    /**
     * Génère ou régénère les lignes depuis les repas de la période : quantités et repas d'origine mis à jour,
     * nouveaux ingrédients ajoutés (« déjà à la maison » s'ils sont au garde-manger), lignes dont plus aucun repas
     * n'a besoin supprimées. Statuts (acheté, déjà à la maison, retiré) et articles manuels conservés.
     */
    public ShoppingListDTO generate(LocalDate debut, LocalDate fin) {
        if (fin.isBefore(debut)) {
            throw new BusinessRuleException("dateFin doit être postérieure ou égale à dateDebut");
        }
        if (ChronoUnit.DAYS.between(debut, fin) >= JOURS_MAX) {
            throw new BusinessRuleException("La période ne peut pas dépasser " + JOURS_MAX + " jours");
        }
        List<AggregatedLine> lines = aggregator.aggregate(mealRepository.findWithIngredientsByDateBetween(debut, fin));
        Set<String> garde = pantryRepository.findAll().stream().map(PantryItem::getNomNormalise)
                .collect(Collectors.toSet());
        Map<String, ShoppingItem> existants = itemRepository.findByOrigine(ShoppingItemOrigin.GENERE).stream()
                .collect(Collectors.toMap(ShoppingItem::getCleGeneration, Function.identity()));

        List<ShoppingItem> aEnregistrer = new ArrayList<>();
        for (AggregatedLine line : lines) {
            ShoppingItem item = existants.remove(line.cle());
            if (item == null) {
                item = new ShoppingItem();
                item.setOrigine(ShoppingItemOrigin.GENERE);
                item.setCleGeneration(line.cle());
                item.setALaMaison(garde.contains(line.ingredient().getNomNormalise()));
            }
            if (!item.isModifie()) {
                item.setNom(line.ingredient().getNom());
                item.setNomNormalise(line.ingredient().getNomNormalise());
                item.setQuantite(line.quantite());
                item.setUnite(line.unite());
            }
            item.setIngredient(line.ingredient());
            item.setSources(new ArrayList<>(line.sources()));
            aEnregistrer.add(item);
        }
        // Restent les lignes dont plus aucun repas de la période n'a besoin
        itemRepository.deleteAll(existants.values());
        itemRepository.saveAll(aEnregistrer);

        ShoppingList list = listRepository.findById(ShoppingList.ID).orElseGet(ShoppingList::new);
        list.setDateDebut(debut);
        list.setDateFin(fin);
        list.setGenereLe(LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS));
        listRepository.save(list);
        return get();
    }

    public ShoppingItemDTO addManual(ShoppingItemRequest request) {
        ShoppingItem item = new ShoppingItem();
        item.setOrigine(ShoppingItemOrigin.MANUEL);
        apply(request, item);
        return mapper.toDto(itemRepository.save(item));
    }

    /** Une ligne générée modifiée garde ensuite son nom, sa quantité et son unité aux régénérations. */
    public ShoppingItemDTO update(Long id, ShoppingItemRequest request) {
        ShoppingItem item = load(id);
        apply(request, item);
        if (item.getOrigine() == ShoppingItemOrigin.GENERE) {
            item.setModifie(true);
        }
        return mapper.toDto(itemRepository.save(item));
    }

    public ShoppingItemDTO updateStatus(Long id, ShoppingItemStatusRequest request) {
        if (request.achete() == null && request.aLaMaison() == null) {
            throw new BusinessRuleException("Indiquer achete et/ou aLaMaison");
        }
        ShoppingItem item = load(id);
        if (request.achete() != null) {
            item.setAchete(request.achete());
        }
        if (request.aLaMaison() != null) {
            item.setALaMaison(request.aLaMaison());
        }
        return mapper.toDto(item);
    }

    /** Article manuel : effacé. Ligne générée : retirée (ne revient pas à la régénération). */
    public void delete(Long id) {
        remove(load(id));
    }

    /** Retire de la liste tous les articles cochés. */
    public void clearBought() {
        itemRepository.findByAcheteTrueAndRetireFalse().forEach(this::remove);
    }

    private void remove(ShoppingItem item) {
        if (item.getOrigine() == ShoppingItemOrigin.MANUEL) {
            itemRepository.delete(item);
        } else {
            item.setRetire(true);
        }
    }

    private void apply(ShoppingItemRequest request, ShoppingItem item) {
        if (request.unite() != null && request.quantite() == null) {
            throw new BusinessRuleException("Une unité demande une quantité");
        }
        String nom = IngredientService.nettoyer(request.nom());
        item.setNom(nom);
        item.setNomNormalise(IngredientService.normaliser(nom));
        item.setQuantite(request.quantite() == null ? null : ShoppingListAggregator.arrondir(request.quantite()));
        item.setUnite(request.unite());
        if (item.getOrigine() == ShoppingItemOrigin.MANUEL) {
            // Ingrédient connu : l'article prend son rayon
            Ingredient ingredient = ingredientRepository.findByNomNormalise(item.getNomNormalise()).orElse(null);
            item.setIngredient(ingredient);
        }
    }

    private ShoppingItem load(Long id) {
        return itemRepository.findById(id).filter(item -> !item.isRetire())
                .orElseThrow(() -> new ResourceNotFoundException("Article", id));
    }
}
