package com.family.agenda.service;

import com.family.agenda.dto.PantryItemDTO;
import com.family.agenda.entity.PantryItem;
import com.family.agenda.exception.ResourceNotFoundException;
import com.family.agenda.mapper.ShoppingMapper;
import com.family.agenda.repository.PantryItemRepository;
import com.family.agenda.repository.ShoppingItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Garde-manger : ce qu'on a toujours à la maison, marqué « déjà à la maison » dans la liste de courses. */
@Service
@RequiredArgsConstructor
@Transactional
public class PantryService {

    private final PantryItemRepository repository;
    private final ShoppingItemRepository itemRepository;
    private final ShoppingMapper mapper;

    /** @param created faux si l'article était déjà au garde-manger (même nom normalisé) */
    public record AddResult(PantryItemDTO item, boolean created) {
    }

    @Transactional(readOnly = true)
    public List<PantryItemDTO> findAll() {
        return repository.findAllByOrderByNomAsc().stream().map(mapper::toDto).toList();
    }

    /** Ajoute l'article (s'il n'y est pas déjà) et marque « déjà à la maison » les lignes de même nom dans la liste. */
    public AddResult add(String nom) {
        String nettoye = IngredientService.nettoyer(nom);
        String normalise = IngredientService.normaliser(nettoye);
        itemRepository.findByNomNormaliseAndRetireFalse(normalise).forEach(item -> item.setALaMaison(true));
        return repository.findByNomNormalise(normalise)
                .map(existing -> new AddResult(mapper.toDto(existing), false))
                .orElseGet(() -> new AddResult(mapper.toDto(repository.save(new PantryItem(nettoye, normalise))), true));
    }

    /** Les lignes déjà marquées dans la liste le restent ; seules les générations suivantes changent. */
    public void delete(Long id) {
        repository.delete(repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Article du garde-manger", id)));
    }
}
