package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Ingrédient réutilisable entre recettes. Unique par nom normalisé (sans casse, accents ni espaces superflus) :
 * « Tomate », « tomate » et « tomàte » désignent le même ingrédient.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nom affiché, tel que saisi la première fois. */
    @Column(nullable = false, length = 100)
    private String nom;

    @Column(name = "nom_normalise", nullable = false, length = 100, unique = true)
    private String nomNormalise;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Aisle rayon;

    public Ingredient(String nom, String nomNormalise) {
        this.nom = nom;
        this.nomNormalise = nomNormalise;
    }
}
