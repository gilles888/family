package com.family.agenda.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Ligne de la liste de courses : générée depuis les repas planifiés, ou ajoutée à la main.
 * Les statuts (acheté, déjà à la maison, retiré) survivent aux régénérations.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "shopping_item")
public class ShoppingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(name = "nom_normalise", nullable = false, length = 100)
    private String nomNormalise;

    /** Facultative pour un article manuel. */
    @Column(precision = 10, scale = 3)
    private BigDecimal quantite;

    /** Facultative ; jamais sans quantité. */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private IngredientUnit unite;

    /** Ingrédient connu (pour son rayon) : toujours pour une ligne générée, si le nom correspond pour un article manuel. */
    @ManyToOne
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ShoppingItemOrigin origine;

    /** Ligne générée : nom normalisé + famille d'unité, qui la retrouve d'une génération à l'autre. */
    @Column(name = "cle_generation", length = 130, unique = true)
    private String cleGeneration;

    @Column(nullable = false)
    private boolean achete;

    @Column(name = "a_la_maison", nullable = false)
    private boolean aLaMaison;

    /** Ligne générée supprimée ou vidée après achat : masquée tant qu'un repas en a besoin (sinon elle reviendrait). */
    @Column(nullable = false)
    private boolean retire;

    /** Ligne générée modifiée à la main : la régénération garde son nom, sa quantité et son unité. */
    @Column(nullable = false)
    private boolean modifie;

    @ElementCollection
    @CollectionTable(name = "shopping_item_source", joinColumns = @JoinColumn(name = "shopping_item_id"))
    @OrderBy("date ASC, creneau ASC")
    private List<ShoppingItemSource> sources = new ArrayList<>();
}
