package com.family.agenda.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PortionCalculatorTest {

    private final PortionCalculator calculator = new PortionCalculator();

    private String proratiser(String quantite, int reference, int portions) {
        return calculator.proratiser(new BigDecimal(quantite), reference, portions).toPlainString();
    }

    @Test
    void memesPortionsQuantiteInchangee() {
        assertThat(proratiser("400", 4, 4)).isEqualTo("400");
        assertThat(proratiser("1.5", 4, 4)).isEqualTo("1.5");
    }

    @Test
    void proportionnelAuxPortions() {
        assertThat(proratiser("400", 4, 6)).isEqualTo("600");
        assertThat(proratiser("400", 4, 2)).isEqualTo("200");
        assertThat(proratiser("3", 4, 1)).isEqualTo("0.75");
        assertThat(proratiser("0.5", 2, 5)).isEqualTo("1.25");
    }

    @Test
    void arrondiADeuxDecimalesAuPlusProche() {
        assertThat(proratiser("100", 3, 1)).isEqualTo("33.33");
        assertThat(proratiser("200", 3, 1)).isEqualTo("66.67");
        assertThat(proratiser("1", 3, 2)).isEqualTo("0.67");
    }

    @Test
    void sansNotationScientifique() {
        assertThat(calculator.proratiser(new BigDecimal("500"), 1, 2).scale()).isZero();
        assertThat(proratiser("250.000", 1, 4)).isEqualTo("1000");
    }

    @Test
    void portionsInvalidesRefusees() {
        assertThatThrownBy(() -> calculator.proratiser(BigDecimal.ONE, 0, 4)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> calculator.proratiser(BigDecimal.ONE, 4, 0)).isInstanceOf(IllegalArgumentException.class);
    }
}
