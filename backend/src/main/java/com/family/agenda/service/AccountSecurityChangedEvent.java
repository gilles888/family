package com.family.agenda.service;

/**
 * Mot de passe changé ou réinitialisé, compte désactivé, rôle ou membre changé : les jetons « rester connecté » du
 * compte sont révoqués (et les sessions ouvertes avant sont refusées, via la version de sécurité du compte).
 */
public record AccountSecurityChangedEvent(String identifiant) {
}
