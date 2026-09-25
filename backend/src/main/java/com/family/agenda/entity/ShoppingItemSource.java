package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import java.time.LocalDate;

/** Repas à l'origine d'une ligne générée : copie de ce qu'il faut pour l'afficher (« pour : lasagnes lundi »). */
@Embeddable
public record ShoppingItemSource(
        @Column(name = "repas_id", nullable = false) Long repasId,
        @Column(name = "date_repas", nullable = false) LocalDate date,
        @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) MealSlot creneau,
        @Column(nullable = false, length = 150) String titre) {
}
