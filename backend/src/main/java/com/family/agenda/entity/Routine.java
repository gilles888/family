package com.family.agenda.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/** Routine d'un membre (« Ma routine du matin ») : une liste d'étapes illustrées à cocher chaque jour. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Routine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private FamilyMember member;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(name = "sous_titre", length = 150)
    private String sousTitre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RoutineType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RoutineTheme theme;

    /** Jours où la routine est proposée. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "routine_jours", joinColumns = @JoinColumn(name = "routine_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "jour", length = 10)
    private Set<DayOfWeek> jours = EnumSet.noneOf(DayOfWeek.class);

    /** Plage horaire indicative (les deux ou aucune). */
    @Column(name = "heure_debut")
    private LocalTime heureDebut;

    @Column(name = "heure_fin")
    private LocalTime heureFin;

    @Column(nullable = false)
    private boolean active = true;

    /** Ordre d'affichage parmi les routines du membre. */
    @Column(nullable = false)
    private int position;

    @OneToMany(mappedBy = "routine", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<RoutineStep> steps = new ArrayList<>();
}
