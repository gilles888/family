package com.family.agenda.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.json.JsonMapper;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Validation du fichier famille : toutes les erreurs dans un message clair. */
class FamilySeedReaderTest {

    private final FamilySeedReader reader = new FamilySeedReader(JsonMapper.builder().build());

    @TempDir Path dir;

    private Path file(String json) throws Exception {
        return Files.writeString(dir.resolve("famille.json"), json);
    }

    @Test
    void fichierValide() {
        FamilySeed seed = reader.read(Path.of("src/test/resources/famille-test.json"));

        assertThat(seed.membres()).hasSize(4);
        // avatar complet (plus de 10 champs) lu tel quel
        assertThat(seed.membres().getFirst().avatar()).hasSize(12).containsEntry("eyeColor", "#5d4037");
        assertThat(seed.activites()).hasSize(4);
    }

    @Test
    void exempleDuDepotValide() {
        // famille.exemple.json documente le format : il doit rester chargeable
        FamilySeed seed = reader.read(Path.of("famille.exemple.json"));

        assertThat(seed.membres()).extracting(FamilySeed.Membre::nom).containsExactly("Maman", "Papa", "Léa", "Tom");
    }

    @Test
    void erreursRassembleesAvecLeurChemin() throws Exception {
        Path f = file("""
                { "membres": [
                    { "cle": "a", "nom": "A", "couleur": "rouge", "routines": { "langue": "de", "modeles": ["midi"] } },
                    { "cle": "a", "nom": "B", "couleur": "#000000" } ],
                  "activites": [
                    { "titre": "Judo", "type": "KARATE", "membres": ["zz"], "jours": ["LUNDI"], "debut": "9h", "fin": "25:00" },
                    { "titre": "Piano", "type": "AUTRE", "membres": ["a"], "jours": ["MONDAY"], "debut": "18:00", "fin": "17:00" } ] }""");

        assertThatThrownBy(() -> reader.read(f))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("membres[0].couleur : « rouge »")
                .hasMessageContaining("membres[0].routines.langue : « de »")
                .hasMessageContaining("modèle « midi » inconnu")
                .hasMessageContaining("membres[1].cle : « a » est déjà utilisée")
                .hasMessageContaining("activites[0].type : « KARATE » inconnu")
                .hasMessageContaining("clé de membre « zz » inconnue")
                .hasMessageContaining("« LUNDI » n'est pas un jour")
                .hasMessageContaining("activites[0].debut : « 9h » n'est pas une heure HH:mm")
                .hasMessageContaining("activites[0].fin : « 25:00 » n'est pas une heure HH:mm")
                .hasMessageContaining("activites[1].fin : 17:00 doit suivre le début (18:00)");
    }

    @Test
    void cleInconnueEtJsonIllisible() throws Exception {
        Path inconnue = file("""
                { "membres": [ { "cle": "a", "nom": "A", "coleur": "#000000" } ] }""");
        assertThatThrownBy(() -> reader.read(inconnue)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("illisible").hasMessageContaining("coleur");

        Path casse = file("{ \"membres\": [ ");
        assertThatThrownBy(() -> reader.read(casse)).isInstanceOf(IllegalStateException.class).hasMessageContaining("illisible");
    }
}
