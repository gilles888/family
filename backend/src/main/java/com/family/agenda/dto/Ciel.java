package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "État du ciel, simplifié depuis le code météo WMO")
public enum Ciel {
    SOLEIL, ECLAIRCIES, NUAGEUX, BROUILLARD, BRUINE, PLUIE, NEIGE, ORAGE;

    /** Code WMO (champ {@code weather_code} d'Open-Meteo) → ciel. Code absent ou inconnu : {@link #NUAGEUX}. */
    public static Ciel fromWmo(Integer code) {
        if (code == null) {
            return NUAGEUX;
        }
        return switch (code) {
            case 0 -> SOLEIL;
            case 1, 2 -> ECLAIRCIES;
            case 3 -> NUAGEUX;
            case 45, 48 -> BROUILLARD;
            case 51, 53, 55, 56, 57 -> BRUINE;
            case 61, 63, 65, 66, 67, 80, 81, 82 -> PLUIE;
            case 71, 73, 75, 77, 85, 86 -> NEIGE;
            case 95, 96, 99 -> ORAGE;
            default -> NUAGEUX;
        };
    }

    /** Précipitations annoncées par le ciel lui-même, quel que soit le pourcentage de risque. */
    public boolean isMouille() {
        return this == BRUINE || this == PLUIE || this == NEIGE || this == ORAGE;
    }
}
