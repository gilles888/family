package com.family.agenda.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class IngredientServiceTest {

    @Test
    void nettoyerRetireLesEspacesSuperflus() {
        assertThat(IngredientService.nettoyer("  Crème   fraîche ")).isEqualTo("Crème fraîche");
    }

    @Test
    void normaliserIgnoreCasseAccentsEtEspaces() {
        assertThat(IngredientService.normaliser("  Crème   Fraîche ")).isEqualTo("creme fraiche");
        assertThat(IngredientService.normaliser("ŒUFS")).isEqualTo("oeufs");
        assertThat(IngredientService.normaliser("Haché bœuf")).isEqualTo("hache boeuf");
        assertThat(IngredientService.normaliser("Tomàte")).isEqualTo(IngredientService.normaliser("tomate"));
    }
}
