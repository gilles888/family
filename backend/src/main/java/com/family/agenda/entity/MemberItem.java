package com.family.agenda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Article payant possédé par un membre (les articles gratuits sont possédés d'office, sans ligne). */
@Entity
@IdClass(MemberItemId.class)
@Getter
@Setter
@NoArgsConstructor
public class MemberItem {

    @Id
    @Column(name = "member_id")
    private Long memberId;

    @Id
    @Column(name = "article_id", length = 60)
    private String articleId;

    @Column(name = "acquis_le", nullable = false)
    private LocalDateTime acquisLe;

    /** 0 pour un cadeau. */
    @Column(name = "prix_paye", nullable = false)
    private int prixPaye;
}
