package com.family.agenda.entity;

/** Provenance d'une ligne de la liste de courses. */
public enum ShoppingItemOrigin {
    /** Calculée depuis les repas planifiés : mise à jour à chaque régénération. */
    GENERE,
    /** Ajoutée à la main : jamais touchée par la régénération. */
    MANUEL
}
