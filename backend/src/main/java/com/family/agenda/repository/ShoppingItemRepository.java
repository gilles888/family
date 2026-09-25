package com.family.agenda.repository;

import com.family.agenda.entity.ShoppingItem;
import com.family.agenda.entity.ShoppingItemOrigin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShoppingItemRepository extends JpaRepository<ShoppingItem, Long> {

    /** Lignes affichées (non retirées). Le tri par rayon se fait dans l'interface. */
    List<ShoppingItem> findByRetireFalseOrderByNomAsc();

    List<ShoppingItem> findByOrigine(ShoppingItemOrigin origine);

    List<ShoppingItem> findByAcheteTrueAndRetireFalse();

    List<ShoppingItem> findByNomNormaliseAndRetireFalse(String nomNormalise);
}
