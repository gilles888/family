package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Période de la dernière génération de la liste de courses. Une seule liste pour la famille : id = 1. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "shopping_list")
public class ShoppingList {

    public static final long ID = 1L;

    @Id
    private Long id = ID;

    @Column(name = "date_debut", nullable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin", nullable = false)
    private LocalDate dateFin;

    @Column(name = "genere_le", nullable = false)
    private LocalDateTime genereLe;
}
