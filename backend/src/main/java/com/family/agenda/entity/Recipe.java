package com.family.agenda.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/** Recette type, partagée par toute la famille, réutilisable pour planifier des repas. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nom;

    @Column(length = 500)
    private String description;

    /** Nombre de portions pour lesquelles les quantités des ingrédients sont données. */
    @Column(nullable = false)
    private int portions;

    /** En minutes. */
    @Column(name = "temps_preparation")
    private Integer tempsPreparation;

    @Column(length = 10000)
    private String instructions;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<RecipeIngredient> ingredients = new ArrayList<>();
}
