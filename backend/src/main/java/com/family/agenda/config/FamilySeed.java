package com.family.agenda.config;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * Contenu du fichier famille ({@code agenda.seed.fichier}, ex. famille.json) : membres, personnages, routines,
 * activités hebdomadaires et comptes de connexion. Format documenté dans le README du backend, exemple dans famille.exemple.json.
 */
public record FamilySeed(List<Membre> membres, List<Activite> activites, List<Compte> comptes) {

    /**
     * @param cle      identifiant du membre dans le fichier (référencé par les activités)
     * @param avatar   personnage, au format avatarConfig du front ; absent = avatar par défaut
     * @param routines modèles de routines à copier ; absent = aucune routine
     */
    public record Membre(String cle, String nom, String couleur, Map<String, Object> avatar, Routines routines) {
    }

    /** @param langue fr ou nl ; @param modeles modèles à copier (voir {@link Modele}) */
    public record Routines(String langue, List<Modele> modeles) {
    }

    /**
     * Modèle de routine à copier : son nom seul ({@code "matin"}) ou un objet qui change ses jours et sa plage horaire
     * ({@code {"modele": "devoirs", "jours": ["SATURDAY"], "debut": "14:00", "fin": "15:00"}}).
     *
     * @param modele matin, soir, devoirs
     * @param jours  jours de la semaine (MONDAY … SUNDAY) ; absent = jours du modèle
     * @param debut  heure de début HH:mm ; absente = celle du modèle
     * @param fin    heure de fin HH:mm ; absente = celle du modèle
     */
    public record Modele(String modele, List<String> jours, String debut, String fin) {

        @JsonCreator(mode = JsonCreator.Mode.PROPERTIES)
        public Modele(@JsonProperty("modele") String modele, @JsonProperty("jours") List<String> jours,
                      @JsonProperty("debut") String debut, @JsonProperty("fin") String fin) {
            this.modele = modele;
            this.jours = jours;
            this.debut = debut;
            this.fin = fin;
        }

        @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
        public static Modele of(String modele) {
            return new Modele(modele, null, null, null);
        }
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

    /**
     * Compte de connexion.
     *
     * @param role              PARENT ou ENFANT
     * @param membre            clé du membre lié (obligatoire pour un enfant)
     * @param motDePasseInitial facultatif : haché au chargement, à changer à la première connexion ; absent = compte
     *                          inactif tant qu'un parent n'a pas défini de mot de passe
     */
    public record Compte(String identifiant, String role, String membre, String motDePasseInitial) {

        /** Jamais le mot de passe dans les journaux ni les messages d'erreur. */
        @Override
        public String toString() {
            return "Compte[identifiant=%s, role=%s, membre=%s, motDePasseInitial=%s]"
                    .formatted(identifiant, role, membre, motDePasseInitial == null ? null : "***");
        }
    }
}
