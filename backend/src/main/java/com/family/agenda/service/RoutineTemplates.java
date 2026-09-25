package com.family.agenda.service;

import com.family.agenda.entity.RoutineTheme;
import com.family.agenda.entity.RoutineType;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Modèles de routines prêts à l'emploi (matin, soir), en néerlandais et en français. Appliquer un modèle en fait une
 * copie modifiable chez le membre : modifier un modèle ici ne touche pas les routines déjà créées.
 */
public final class RoutineTemplates {

    /** Couleurs pastel des lignes, en alternance. */
    public static final List<String> PASTELS = List.of(
            "#FDE2E4", "#E2F0CB", "#FFF1C1", "#DBEAFE", "#EDE9FE", "#FCE7F3", "#DCFCE7", "#FFEDD5");

    public record Text(String nom, String sousTitre, List<String> etapes) {
    }

    public record Template(String id, RoutineType type, RoutineTheme theme, Set<DayOfWeek> jours, LocalTime debut,
                           LocalTime fin, List<String> icones, Map<String, Text> textes) {

        public Text text(String langue) {
            return textes.getOrDefault(langue, textes.get("fr"));
        }
    }

    private static final Set<DayOfWeek> SEMAINE = EnumSet.range(DayOfWeek.MONDAY, DayOfWeek.FRIDAY);
    /** Veilles de jour d'école. */
    private static final Set<DayOfWeek> VEILLES = EnumSet.of(DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY);

    public static final List<Template> ALL = List.of(
            new Template("matin", RoutineType.MORNING, RoutineTheme.DAY, SEMAINE, LocalTime.of(6, 30), LocalTime.of(8, 30),
                    List.of("wake-up", "toilet", "toothbrush", "washbasin", "clothes", "comb", "breakfast", "schoolbag",
                            "shoes", "finish"),
                    Map.of(
                            "nl", new Text("Mijn ochtendroutine", "Een goede start van de dag!", List.of(
                                    "Ik sta op.", "Ik ga naar het toilet.", "Ik poets mijn tanden.", "Ik was mijn gezicht.",
                                    "Ik kleed me aan.", "Ik kam mijn haar.", "Ik eet mijn ontbijt.",
                                    "Ik neem mijn boekentas.", "Ik doe mijn schoenen aan.", "Ik ben klaar!")),
                            "fr", new Text("Ma routine du matin", "Un bon début de journée !", List.of(
                                    "Je me lève.", "Je vais aux toilettes.", "Je me brosse les dents.",
                                    "Je me lave le visage.", "Je m'habille.", "Je me coiffe.",
                                    "Je prends mon petit-déjeuner.", "Je prends mon cartable.", "Je mets mes chaussures.",
                                    "Je suis prêt !")))),
            new Template("soir", RoutineType.EVENING, RoutineTheme.NIGHT, VEILLES, LocalTime.of(18, 30), LocalTime.of(20, 30),
                    List.of("schoolbag", "clothes", "shower", "toothbrush", "pyjamas", "schoolbag", "book", "bed", "moon"),
                    Map.of(
                            "nl", new Text("Mijn avondroutine", "Rustig naar een fijne nacht!", List.of(
                                    "Ik ruim mijn boekentas op.", "Ik doe mijn kleren uit.",
                                    "Ik neem een douche of ik was me.", "Ik poets mijn tanden.", "Ik doe mijn pyjama aan.",
                                    "Ik maak mijn boekentas klaar.", "Ik lees een boek.", "Ik ga naar bed.",
                                    "Welterusten!")),
                            "fr", new Text("Ma routine du soir", "Tout doux vers une belle nuit !", List.of(
                                    "Je range mon cartable.", "J'enlève mes vêtements.",
                                    "Je prends une douche ou je me lave.", "Je me brosse les dents.", "Je mets mon pyjama.",
                                    "Je prépare mon cartable.", "Je lis un livre.", "Je vais au lit.", "Bonne nuit !")))));

    private RoutineTemplates() {
    }

    public static Optional<Template> find(String id) {
        return ALL.stream().filter(t -> t.id().equals(id)).findFirst();
    }

    public static String pastel(int index) {
        return PASTELS.get(index % PASTELS.size());
    }
}
