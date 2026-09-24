package com.family.agenda.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Vêtements et accessoires conseillés. L'ordre des constantes est l'ordre d'affichage. */
@Schema(description = "Vêtement ou accessoire conseillé")
public enum Vetement {
    T_SHIRT, PULL, VESTE, MANTEAU, IMPERMEABLE, SHORT, PANTALON, BONNET, ECHARPE, GANTS, BOTTES, CASQUETTE, CREME_SOLAIRE
}
