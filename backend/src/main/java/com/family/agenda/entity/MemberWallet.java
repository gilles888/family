package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Porte-monnaie d'un membre : pièces d'or et étoiles déjà échangées. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class MemberWallet {

    @Id
    @Column(name = "member_id")
    private Long memberId;

    @Column(nullable = false)
    private int pieces;

    @Column(name = "etoiles_converties", nullable = false)
    private int etoilesConverties;

    @Version
    private Integer version;

    public MemberWallet(Long memberId) {
        this.memberId = memberId;
    }
}
