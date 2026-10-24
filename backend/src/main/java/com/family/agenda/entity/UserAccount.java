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

/** Compte de connexion. Lié (ou non) à un membre de la famille : un enfant ne voit que les routines de son membre. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** En minuscules (unicité insensible à la casse). */
    @Column(nullable = false, length = 50, unique = true)
    private String identifiant;

    /** Haché (Argon2, préfixe {argon2}) ; null = aucun mot de passe défini. */
    @Column(name = "password_hash")
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private AccountRole role;

    @Column(name = "member_id")
    private Long memberId;

    @Column(nullable = false)
    private boolean actif;

    @Column(name = "doit_changer_mot_de_passe", nullable = false)
    private boolean doitChangerMotDePasse;

    @Column(name = "echecs_connexion", nullable = false)
    private int echecsConnexion;

    @Column(name = "bloque_jusqua")
    private LocalDateTime bloqueJusqua;

    @Column(name = "derniere_connexion")
    private LocalDateTime derniereConnexion;

    @Column(name = "cree_le", nullable = false)
    private LocalDateTime creeLe;

    @Column(name = "version_securite", nullable = false)
    private int versionSecurite;

    public boolean isBloque(LocalDateTime now) {
        return bloqueJusqua != null && now.isBefore(bloqueJusqua);
    }

    /** Invalide les sessions et jetons « rester connecté » ouverts avant ce changement. */
    public void incrementerVersionSecurite() {
        versionSecurite++;
    }
}
