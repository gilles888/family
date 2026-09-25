package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Article du garde-manger : ce qu'on a toujours à la maison (sel, poivre…). À la génération de la liste de courses,
 * les lignes de même nom normalisé sont marquées « déjà à la maison ».
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "pantry_item")
public class PantryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(name = "nom_normalise", nullable = false, length = 100, unique = true)
    private String nomNormalise;

    public PantryItem(String nom, String nomNormalise) {
        this.nom = nom;
        this.nomNormalise = nomNormalise;
    }
}
