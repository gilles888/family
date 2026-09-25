package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Étape d'une routine : « Ik poets mijn tanden. », avec son illustration et la couleur de sa ligne. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "routine_step")
public class RoutineStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "routine_id", nullable = false)
    private Routine routine;

    /** Ordre dans la routine (0 = première étape). */
    @Column(nullable = false)
    private int position;

    /** Texte libre saisi par le parent, dans la langue de son choix. */
    @Column(nullable = false, length = 150)
    private String libelle;

    /** Id d'une illustration du catalogue du front (ex. « toothbrush »). */
    @Column(nullable = false, length = 40)
    private String icone;

    /** Couleur pastel de la ligne, #RRGGBB. */
    @Column(nullable = false, length = 7)
    private String couleur;
}
