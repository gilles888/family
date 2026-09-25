package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class FamilyMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nom;

    /** Couleur d'affichage au format hexadécimal, ex. #E91E63. */
    @Column(nullable = false, length = 7)
    private String couleur;

    /**
     * Personnage choisi dans l'éditeur du front, en JSON (pièces du catalogue, couleurs, version du catalogue).
     * Null = avatar par défaut, calculé par le front.
     */
    @Column(name = "avatar_config", length = 4000)
    private String avatarConfig;
}
