package com.family.agenda.repository;

import com.family.agenda.entity.PantryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PantryItemRepository extends JpaRepository<PantryItem, Long> {

    List<PantryItem> findAllByOrderByNomAsc();

    Optional<PantryItem> findByNomNormalise(String nomNormalise);
}
