package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Réglages communs à la famille : une seule ligne, d'id 1 (créée par la migration). */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class FamilySettings {

    public static final long ID = 1L;

    @Id
    private Long id = ID;

    @Enumerated(EnumType.STRING)
    @Column(name = "theme_mode", nullable = false, length = 10)
    private ThemeMode themeMode = ThemeMode.AUTO;

    @Enumerated(EnumType.STRING)
    @Column(name = "theme_force", length = 20)
    private Saison themeForce;

    /** Membre fêté quand le thème forcé est ANNIVERSAIRE (null si le membre a été supprimé). */
    @Column(name = "theme_force_membre_id")
    private Long themeForceMembreId;

    /** Dernier jour du thème forcé ; ensuite retour automatique en AUTO. Null = sans limite. */
    @Column(name = "theme_force_jusqua")
    private LocalDate themeForceJusqua;

    @Column(name = "anniversaires_actifs", nullable = false)
    private boolean anniversairesActifs = true;

    @Column(name = "enfants_peuvent_choisir", nullable = false)
    private boolean enfantsPeuventChoisir = false;

    @Column(name = "modifie_par")
    private Long modifiePar;

    @Column(name = "modifie_le")
    private LocalDateTime modifieLe;
}
