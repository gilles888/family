package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Repas planifié : une recette type OU un libellé libre (« Restes », « Resto »), jamais les deux.
 * Un seul repas par (date, créneau).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "meal", uniqueConstraints = @UniqueConstraint(name = "uk_meal_date_creneau",
        columnNames = {"date_repas", "creneau"}))
public class Meal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "date_repas", nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MealSlot creneau;

    @Column(nullable = false)
    private int portions;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;

    @Column(length = 100)
    private String libelle;
}
