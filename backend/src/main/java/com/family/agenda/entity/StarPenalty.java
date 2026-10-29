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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Étoiles retirées à un membre par un parent, un jour donné, pour un motif. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class StarPenalty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private FamilyMember member;

    @Column(name = "date_retrait", nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private int nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StarPenaltyReason motif;

    @Column(length = 255)
    private String commentaire;

    /** Compte du parent (null si le compte a disparu). */
    @Column(name = "cree_par")
    private Long creePar;

    @Column(name = "cree_le", nullable = false)
    private LocalDateTime creeLe;
}
