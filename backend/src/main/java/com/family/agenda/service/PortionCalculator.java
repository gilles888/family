package com.family.agenda.service;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Recalcule une quantité d'ingrédient pour un autre nombre de portions (calcul pur). */
@Component
public class PortionCalculator {

    static final int DECIMALES = 2;

    /**
     * {@code quantite × portions ÷ portionsReference}, arrondi à 2 décimales (au plus proche), sans zéros inutiles :
     * 400 g pour 4 → 600 pour 6 ; 3 œufs pour 4 → 0.75 pour 1.
     */
    public BigDecimal proratiser(BigDecimal quantite, int portionsReference, int portions) {
        if (portionsReference <= 0 || portions <= 0) {
            throw new IllegalArgumentException("portions > 0 attendues : %d / %d".formatted(portionsReference, portions));
        }
        BigDecimal resultat = quantite.multiply(BigDecimal.valueOf(portions))
                .divide(BigDecimal.valueOf(portionsReference), DECIMALES, RoundingMode.HALF_UP)
                .stripTrailingZeros();
        // stripTrailingZeros écrit 600 en « 6E+2 » : on revient à une échelle positive
        return resultat.scale() < 0 ? resultat.setScale(0) : resultat;
    }
}
