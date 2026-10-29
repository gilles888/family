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

import java.time.LocalDateTime;

/** Journal des mouvements de pièces d'un membre. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class CoinTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CoinTransactionType type;

    /** Signé : positif = gagnées, négatif = dépensées. */
    @Column(nullable = false)
    private int pieces;

    /** Étoiles échangées (type ECHANGE). */
    private Integer etoiles;

    @Column(name = "article_id", length = 60)
    private String articleId;

    @Column(length = 255)
    private String commentaire;

    /** Compte à l'origine du mouvement (null si le compte a disparu). */
    @Column(name = "cree_par")
    private Long creePar;

    @Column(name = "cree_le", nullable = false)
    private LocalDateTime creeLe;
}
