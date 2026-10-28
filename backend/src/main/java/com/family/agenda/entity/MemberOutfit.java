package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Tenue enregistrée par un membre pour un thème : config du personnage en JSON. */
@Entity
@IdClass(MemberOutfitId.class)
@Getter
@Setter
@NoArgsConstructor
public class MemberOutfit {

    @Id
    @Column(name = "member_id")
    private Long memberId;

    @Id
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Saison theme;

    @Column(nullable = false, length = 2000)
    private String config;
}
