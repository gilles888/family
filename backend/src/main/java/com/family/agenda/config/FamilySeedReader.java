package com.family.agenda.config;

import com.family.agenda.entity.ReminderType;
import com.family.agenda.service.RoutineTemplates;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Lit et valide le fichier famille. Toutes les erreurs sont rassemblées dans un seul message (« membres[2].couleur :
 * … ») : un fichier invalide arrête le démarrage avec un message clair, plutôt que de charger une famille à moitié.
 */
@Component
@RequiredArgsConstructor
public class FamilySeedReader {

    private static final Pattern COULEUR = Pattern.compile("^#[0-9A-Fa-f]{6}$");
    private static final Pattern HEURE = Pattern.compile("^\\d{2}:\\d{2}$");
    private static final Set<String> LANGUES = Set.of("fr", "nl");
    /** Même limite que PUT /v1/membres/{id}/avatar. */
    private static final int AVATAR_MAX = 2000;

    private final JsonMapper jsonMapper;

    public FamilySeed read(Path file) {
        FamilySeed seed;
        try {
            // Une clé mal orthographiée (« coleur ») est une erreur, pas un champ ignoré
            seed = jsonMapper.readerFor(FamilySeed.class)
                    .with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .readValue(Files.readString(file));
        } catch (IOException | JacksonException e) {
            throw new IllegalStateException("Fichier famille %s illisible : %s".formatted(file, e.getMessage()), e);
        }
        List<String> errors = validate(seed);
        if (!errors.isEmpty()) {
            throw new IllegalStateException("Fichier famille %s invalide :%n - %s".formatted(file, String.join("\n - ", errors)));
        }
        return seed;
    }

    List<String> validate(FamilySeed seed) {
        List<String> errors = new ArrayList<>();
        if (seed == null || seed.membres() == null || seed.membres().isEmpty()) {
            errors.add("membres : au moins un membre est attendu");
            return errors;
        }
        Set<String> cles = new HashSet<>();
        for (int i = 0; i < seed.membres().size(); i++) {
            FamilySeed.Membre m = seed.membres().get(i);
            String at = "membres[%d]".formatted(i);
            if (m == null) {
                errors.add(at + " : membre vide");
                continue;
            }
            if (blank(m.cle())) {
                errors.add(at + ".cle : obligatoire");
            } else if (!cles.add(m.cle())) {
                errors.add(at + ".cle : « %s » est déjà utilisée".formatted(m.cle()));
            }
            if (blank(m.nom()) || m.nom().length() > 100) {
                errors.add(at + ".nom : obligatoire, 100 caractères au plus");
            }
            if (m.couleur() == null || !COULEUR.matcher(m.couleur()).matches()) {
                errors.add(at + ".couleur : « %s » n'est pas une couleur #RRGGBB".formatted(m.couleur()));
            }
            if (m.avatar() != null && jsonMapper.writeValueAsString(m.avatar()).length() > AVATAR_MAX) {
                errors.add(at + ".avatar : plus de %d caractères".formatted(AVATAR_MAX));
            }
            if (m.routines() != null) {
                if (!LANGUES.contains(m.routines().langue())) {
                    errors.add(at + ".routines.langue : « %s » (attendu : fr ou nl)".formatted(m.routines().langue()));
                }
                for (String modele : m.routines().modeles() == null ? List.<String>of() : m.routines().modeles()) {
                    if (RoutineTemplates.find(modele).isEmpty()) {
                        errors.add(at + ".routines.modeles : modèle « %s » inconnu (attendu : %s)".formatted(modele, RoutineTemplates.ALL.stream().map(RoutineTemplates.Template::id).collect(Collectors.joining(", "))));
                    }
                }
            }
        }
        List<FamilySeed.Activite> activites = seed.activites() == null ? List.of() : seed.activites();
        for (int i = 0; i < activites.size(); i++) {
            FamilySeed.Activite a = activites.get(i);
            String at = "activites[%d]".formatted(i);
            if (a == null) {
                errors.add(at + " : activité vide");
                continue;
            }
            if (blank(a.titre()) || a.titre().length() > 200) {
                errors.add(at + ".titre : obligatoire, 200 caractères au plus");
            }
            if (a.type() == null || !isEnum(ReminderType.class, a.type())) {
                errors.add(at + ".type : « %s » inconnu (attendu : SPORT, TEST_MEDICAL, RENDEZ_VOUS, AUTRE)".formatted(a.type()));
            }
            if (a.membres() == null || a.membres().isEmpty()) {
                errors.add(at + ".membres : au moins une clé de membre");
            } else {
                a.membres().stream().filter(cle -> !cles.contains(cle))
                        .forEach(cle -> errors.add(at + ".membres : clé de membre « %s » inconnue".formatted(cle)));
            }
            if (a.jours() == null || a.jours().isEmpty()) {
                errors.add(at + ".jours : au moins un jour (MONDAY … SUNDAY)");
            } else {
                a.jours().stream().filter(j -> j == null || !isEnum(DayOfWeek.class, j))
                        .forEach(j -> errors.add(at + ".jours : « %s » n'est pas un jour (MONDAY … SUNDAY)".formatted(j)));
            }
            LocalTime debut = time(a.debut(), at + ".debut", true, errors);
            LocalTime fin = time(a.fin(), at + ".fin", false, errors);
            if (debut != null && fin != null && !fin.isAfter(debut)) {
                errors.add(at + ".fin : %s doit suivre le début (%s)".formatted(a.fin(), a.debut()));
            }
        }
        return errors;
    }

    /** « 09:00 » → 09:00 ; erreur si mal formée (ou absente alors qu'obligatoire). */
    static LocalTime time(String value, String at, boolean required, List<String> errors) {
        if (value == null) {
            if (required) {
                errors.add(at + " : obligatoire (HH:mm)");
            }
            return null;
        }
        try {
            if (HEURE.matcher(value).matches()) {
                return LocalTime.parse(value);
            }
        } catch (DateTimeParseException ignored) {
            // message ci-dessous
        }
        errors.add(at + " : « %s » n'est pas une heure HH:mm".formatted(value));
        return null;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static <E extends Enum<E>> boolean isEnum(Class<E> type, String value) {
        try {
            Enum.valueOf(type, value);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
