package com.family.agenda.entity;

public enum EntryStatus {
    PREVU,
    COMPLETE,
    ANNULE,
    DEPLACE,
    /**
     * Occurrence supprimée à la main. La ligne est gardée (la contrainte d'unicité reminder + date empêche alors
     * la réconciliation de l'agenda de la recréer) mais elle n'est jamais lue : voir {@code AgendaEntryRepository}.
     */
    SUPPRIME
}
