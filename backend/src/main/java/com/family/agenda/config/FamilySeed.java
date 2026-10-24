package com.family.agenda.config;

import java.util.List;
import java.util.Map;

/**
 * Contenu du fichier famille ({@code agenda.seed.fichier}, ex. famille.json) : membres, personnages, routines et
 * activités hebdomadaires. Format documenté dans le README du backend, exemple dans famille.exemple.json.
 */
public record FamilySeed(List<Membre> membres, List<Activite> activites) {

    /**
     * @param cle      identifiant du membre dans le fichier (référencé par les activités)
     * @param avatar   personnage, au format avatarConfig du front ; absent = avatar par défaut
     * @param routines modèles de routines à copier ; absent = aucune routine
     */
    public record Membre(String cle, String nom, String couleur, Map<String, Object> avatar, Routines routines) {
    }

    /** @param langue fr ou nl ; @param modeles matin, soir */
    public record Routines(String langue, List<String> modeles) {
    }

    /**
     * Activité hebdomadaire, sans date de fin, qui commence aujourd'hui.
     *
     * @param type    type de rappel (SPORT, TEST_MEDICAL, RENDEZ_VOUS, AUTRE)
     * @param membres clés des membres concernés
     * @param jours   jours de la semaine (MONDAY … SUNDAY)
     * @param debut   heure de début HH:mm
     * @param fin     heure de fin HH:mm (facultative)
     */
    public record Activite(String titre, String description, String type, List<String> membres, List<String> jours,
                           String debut, String fin) {
    }
}
