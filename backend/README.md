# Agenda familial — API REST

Backend d'un agenda familial : **Spring Boot 4.1.1** (Spring Framework 7, Hibernate 7, Jackson 3), **Java 25**, Maven.

## Principe central

Un **agenda** est constitué d'`AgendaEntry` **persistées en base** (et non calculées à la volée).
Chaque fois qu'un `Reminder` est créé, ses entrées sont générées et enregistrées, donc **immédiatement visibles** dans l'agenda :

| Reminder créé | Entrées générées |
|---|---|
| ponctuel | 1 entrée |
| récurrent | toutes les occurrences d'une fenêtre glissante (**6 mois** par défaut, paramétrable) |

Un job nocturne (`@Scheduled`) prolonge ensuite la fenêtre pour que l'agenda ne soit jamais à court d'occurrences.

## Lancer le projet

Prérequis : **JDK 25**. Maven n'est pas nécessaire (wrapper inclus).

```bash
./mvnw spring-boot:run          # profil "dev" par défaut : H2 en mémoire + données de test
./mvnw test                     # 76 tests (récurrences, agenda, météo, recettes, repas, prorata des portions)
./mvnw package && java -jar target/family-agenda-0.0.1-SNAPSHOT.jar
```

| | URL |
|---|---|
| API | http://localhost:8080/v1/... |
| **Swagger UI** | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |

Au démarrage en `dev`, un `CommandLineRunner` crée 4 membres (Maman, Papa, Léa, Tom) et 5 reminders (natation hebdo, football mardi+jeudi avec date de fin,
prise de sang ponctuelle, dentiste, anniversaire annuel), ainsi que 3 recettes (spaghetti bolognaise, crêpes, soupe de légumes) et 6 repas dans la semaine en cours. Les dates sont **relatives à aujourd'hui**, l'agenda est donc immédiatement rempli :

```bash
curl "http://localhost:8080/v1/agenda?dateDebut=$(date +%F)&dateFin=$(date -d '+30 days' +%F)"
```

### Profil production (PostgreSQL)

```bash
export SPRING_PROFILES_ACTIVE=prod
export DB_URL=jdbc:postgresql://db-host:5432/family_agenda
export DB_USERNAME=family
export DB_PASSWORD=secret
java -jar target/family-agenda-0.0.1-SNAPSHOT.jar
```

| Variable | Défaut | Rôle |
|---|---|---|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | localhost / `family` / *(obligatoire)* | connexion PostgreSQL |
| `AGENDA_HORIZON_MONTHS` | `6` | fenêtre de génération des occurrences (tous profils) |
| `AGENDA_EXTENSION_CRON` | `0 0 2 * * *` | horaire du job de prolongation (cron Spring à 6 champs) |
| `AGENDA_SEED_ENABLED` | `false` | charger les données de test en prod |
| `SWAGGER_UI_ENABLED` | `true` | désactiver Swagger UI |
| `APP_TIMEZONE` | `Europe/Paris` | fuseau JDBC |
| `METEO_*` | Bruxelles | lieu de la carte météo (tous profils, voir *Météo et tenue conseillée*) |

### Schéma de la base : Flyway

Le schéma est créé et mis à jour par **Flyway** au démarrage, avec les scripts de `src/main/resources/db/migration` (`V1__schema_initial.sql`, `V2__...`). Hibernate ne fait que **valider** (`ddl-auto: validate`) : une entité qui ne correspond pas au schéma empêche le démarrage.

- Les scripts sont en SQL **portable H2 / PostgreSQL** (enums en `varchar` + `check`) : les mêmes migrations servent en dev, en test et en prod.
- **Base existante** (créée avant Flyway par l'ancien `ddl-auto=update`) : au premier démarrage, Flyway la marque en version 1 **sans rejouer V1** (`baseline-on-migrate`), puis applique les migrations suivantes. Vérifié sur PostgreSQL 16 (base neuve et base existante).
- **Modifier le schéma** : ajouter un script `V<n>__description.sql`, ne jamais modifier un script déjà appliqué.

## Exemple : créer un reminder récurrent, puis voir les entrées générées

**1. Créer un cours de piano hebdomadaire (12 séances) pour Léa (id 3)**

```bash
curl -s -X POST http://localhost:8080/v1/reminders \
  -H 'Content-Type: application/json' \
  -d '{
    "titre": "Cours de piano",
    "description": "Conservatoire, salle 4",
    "type": "AUTRE",
    "dateHeureDebut": "2026-09-24T17:00:00",
    "dateHeureFin": "2026-09-24T17:45:00",
    "membreIds": [3],
    "isRecurring": true,
    "recurrence": {
      "frequence": "WEEKLY",
      "intervalle": 1,
      "joursSemaine": ["THURSDAY"],
      "nombreOccurrences": 12
    }
  }'
```

La réponse contient le reminder **et** le résumé des entrées générées :

```json
{
  "reminder": { "id": 6, "titre": "Cours de piano", "isRecurring": true, "recurrence": { "frequence": "WEEKLY", "...": "..." }, "...": "..." },
  "agenda": {
    "nombre": 12,
    "premiereDate": "2026-09-24T17:00:00",
    "derniereDate": "2026-12-10T17:00:00"
  }
}
```

**2. Consulter l'agenda de Léa** — les 12 occurrences sont déjà là :

```bash
curl -s "http://localhost:8080/v1/agenda?dateDebut=2026-09-24&dateFin=2026-10-08&membreId=3"
```

```json
[
  {
    "id": 65, "reminderId": 6, "titre": "Cours de piano", "description": "Conservatoire, salle 4",
    "type": "AUTRE", "dateHeure": "2026-09-24T17:00:00", "dateHeureFin": "2026-09-24T17:45:00",
    "statut": "PREVU", "membres": [{ "id": 3, "nom": "Léa", "couleur": "#FF9800" }], "recurring": true
  }
]
```

**3. Annuler UNE séance** (les 11 autres ne changent pas) :

```bash
curl -s -X PATCH http://localhost:8080/v1/agenda/entries/65 \
  -H 'Content-Type: application/json' -d '{"statut": "ANNULE"}'
```

## Endpoints

Toutes les URL sont préfixées par `/v1`. Les endpoints de l'agenda acceptent `membreId` (optionnel) pour filtrer par membre.

| Méthode | URL | Description |
|---|---|---|
| GET | `/v1/agenda?dateDebut=&dateFin=&membreId=` | entrées de la plage (jours inclus), ordre chronologique |
| GET | `/v1/agenda/jour/{date}` | entrées détaillées d'un jour |
| GET | `/v1/agenda/semaine/{date}` | entrées de la semaine ISO (lundi → dimanche) contenant `date`, ordre chronologique |
| GET | `/v1/agenda/mois/{annee}/{mois}` | entrées du mois groupées par jour : `Map<date, entrées[]>` (jours sans entrée absents) |
| GET | `/v1/agenda/annee/{annee}` | 12 résumés mensuels : total et nombre par type |
| PATCH | `/v1/agenda/entries/{id}` | change le statut d'**une** occurrence (`PREVU`, `COMPLETE`, `ANNULE`, `DEPLACE`) |
| GET / POST | `/v1/reminders` | lister / créer (POST retourne reminder + résumé des entrées générées) |
| GET / PUT / DELETE | `/v1/reminders/{id}` | détail / modifier (régénère le futur) / supprimer |
| GET / POST | `/v1/membres` | lister / créer |
| GET / PUT / DELETE | `/v1/membres/{id}` | détail / modifier / supprimer |
| PUT | `/v1/membres/{id}/avatar` | enregistrer le personnage : objet JSON libre (catalogue côté front, champ `version`), 2000 caractères max ; `null` = avatar par défaut |
| GET | `/v1/recettes?q=` | recettes par ordre alphabétique (résumés), `q` = recherche dans le nom (sans casse) |
| POST | `/v1/recettes` | créer une recette ; ingrédients désignés **par nom**, créés à la volée s'ils n'existent pas |
| GET / PUT / DELETE | `/v1/recettes/{id}` | détail (avec ingrédients) / modifier (remplace tout) / supprimer (les repas gardent son nom) |
| GET | `/v1/recettes/{id}/fiche?portions=` | fiche recette, quantités recalculées au prorata des portions (1 à 100) |
| GET | `/v1/ingredients?q=&limit=` | autocomplétion des ingrédients (sans casse ni accents, 10 résultats par défaut, 50 max) |
| GET | `/v1/repas?dateDebut=&dateFin=` | repas de la plage (jours inclus, 366 jours max), par date puis créneau |
| POST | `/v1/repas` | planifier un repas (409 si le créneau est déjà pris) |
| GET / PUT / DELETE | `/v1/repas/{id}` | détail / modifier / supprimer |
| GET | `/v1/courses` | liste de courses : période de la dernière génération + articles (hors lignes retirées), par ordre alphabétique |
| POST | `/v1/courses/generer` | `{dateDebut, dateFin}` (62 jours max) : génère ou régénère la liste depuis les repas de la période |
| POST | `/v1/courses/articles` | ajouter un article à la main (`nom`, `quantite` et `unite` facultatives, pas d'unité sans quantité) |
| PUT / PATCH / DELETE | `/v1/courses/articles/{id}` | modifier / cocher `achete` ou `aLaMaison` / supprimer |
| DELETE | `/v1/courses/articles/achetes` | vider les articles achetés |
| GET / POST | `/v1/garde-manger` | lister / ajouter (201, ou 200 si déjà présent ; marque « déjà à la maison » les lignes de même nom) |
| DELETE | `/v1/garde-manger/{id}` | retirer du garde-manger |
| GET | `/v1/membres/{id}/routines?date=` | routines du membre (actives ou non) avec leur état du jour demandé (aujourd'hui par défaut) |
| POST | `/v1/membres/{id}/routines/modele` | `{modele: matin\|soir, langue: fr\|nl}` : copie modifiable d'un modèle |
| GET | `/v1/membres/{id}/routines/historique?jours=` | routines terminées par jour (14 derniers jours par défaut, 62 max) |
| GET | `/v1/routines/modeles?langue=` | modèles prêts à l'emploi (matin, soir) |
| POST / GET / PUT / DELETE | `/v1/routines[/{id}]` | créer (avec `membreId`) / détail / modifier (étapes remplacées, une étape gardée par son id garde ses coches) / supprimer |
| PUT | `/v1/routines/{id}/etapes/ordre` | réordonner : ids de toutes les étapes, dans le nouvel ordre |
| POST | `/v1/routines/{id}/runs/{date}/etapes/{stepId}/toggle` | cocher / décocher une étape (aujourd'hui seulement) |
| POST | `/v1/routines/{id}/runs/{date}/recompense` | marquer la récompense jouée (409 si pas terminée ou déjà jouée) |
| GET | `/v1/meteo?jours=` | météo et tenue conseillée pour les enfants, à partir d'aujourd'hui : `jours` de 1 à 7, **2 par défaut** (400 hors bornes, 503 si indisponible) |

Les erreurs sont au format RFC 9457 (`ProblemDetail`) ; les erreurs de validation ajoutent `errors` (champ → message), ex. `errors.dateHeureFin`, `errors["recurrence.dateFin"]`.

## Règles de génération (`AgendaService`)

- **Création** : toutes les occurrences depuis `dateHeureDebut` jusqu'à l'horizon (aujourd'hui + 6 mois, ou début + 6 mois si le reminder démarre plus tard). Un reminder qui démarre dans le passé génère aussi ses entrées passées.
- **Récurrence** : `DAILY`, `WEEKLY` (jours choisis ; vide = jour de la date de début ; semaines ISO comptées depuis le lundi de la semaine de début), `MONTHLY`, `YEARLY`, avec `intervalle`. Fin : `dateFin` (incluse) **ou** `nombreOccurrences` (la 1re comprise) — pas les deux ; aucune des deux = sans fin (borné par la fenêtre).
  Le calcul repart toujours de la date de début : pas de dérive en fin de mois (31 janv. → 28 févr. → 31 mars).
- **Modification (PUT)** : les entrées **futures** sont réconciliées avec la nouvelle définition — supprimées si elles n'existent plus, créées si elles manquent. Une occurrence future qui reste valide **garde son statut** (une séance annulée à la main reste annulée). Les entrées **passées ne sont jamais touchées**.
- **Suppression (DELETE)** : les entrées futures sont supprimées. Si des entrées passées existent, le reminder est **archivé** (`actif = false`, invisible dans l'API) pour qu'elles gardent leur titre ; sinon il est supprimé pour de bon.
- **Job nocturne** (`AgendaExtensionScheduler`) : pour chaque reminder récurrent actif non terminé, ajoute les occurrences manquantes jusqu'au nouvel horizon. Idempotent, ne supprime ni ne modifie rien ; un reminder en erreur n'empêche pas les autres. Une contrainte d'unicité `(reminder, date_heure)` garantit l'absence de doublons.
- **Suppression d'un membre** : il est retiré des reminders concernés (qui sont conservés).

## Repas de la semaine et recettes types

**Recettes** (`RecipeService`) : nom, description courte, portions de référence, temps de préparation (optionnel), instructions (texte libre) et ingrédients ordonnés (quantité + unité : `G, KG, ML, L, PIECE, CUILLERE_SOUPE, CUILLERE_CAFE, BOITE, SACHET, PINCEE`). Partagées par toute la famille (il n'y a pas d'utilisateurs : une installation = une famille).

```bash
curl -s -X POST http://localhost:8080/v1/recettes -H 'Content-Type: application/json' -d '{
  "nom": "Omelette", "portions": 2, "tempsPreparation": 10, "instructions": "Battre les œufs.\nCuire 3 min.",
  "ingredients": [ { "nom": "Œufs", "quantite": 4, "unite": "PIECE" }, { "nom": "Beurre", "quantite": 10, "unite": "G" } ]
}'
curl -s "http://localhost:8080/v1/recettes/1/fiche?portions=6"     # quantités pour 6 personnes
```

- **Ingrédients** (table `ingredient`, `IngredientService`) : réutilisés entre recettes, **uniques par nom normalisé** (sans casse, accents, ligatures ni espaces superflus : « Œufs » = « oeufs »). Une recette les désigne par leur nom : un ingrédient inconnu est créé, un ingrédient connu garde son nom d'origine. Deux lignes avec le même ingrédient dans une recette sont refusées (400). Le **rayon** (`Aisle`) regroupe la liste de courses : rempli par les données de test, pas encore modifiable par l'API.
- **Fiche recette** (`PortionCalculator`) : quantité × portions voulues ÷ portions de la recette, arrondie à 2 décimales au plus proche (3 œufs pour 4 → 0,75 pour 1).
- **Suppression** d'une recette : les repas qui l'utilisaient sont conservés, avec son nom comme libellé libre ; les ingrédients restent.

**Repas** (`MealService`) : date, créneau (`PETIT_DEJEUNER`, `MIDI`, `SOUPER`), portions, et **soit** une recette (`recetteId`) **soit** un libellé libre (`libelle`, ex. « Restes », « Resto »), jamais les deux ni aucun (400, `errors.recetteId`). **Un seul repas par date et créneau** : un deuxième est refusé en **409**. Le champ `titre` de la réponse est le nom de la recette ou le libellé, prêt à afficher.

```bash
curl -s -X POST http://localhost:8080/v1/repas -H 'Content-Type: application/json' \
  -d '{ "date": "2026-09-24", "creneau": "SOUPER", "portions": 4, "recetteId": 1 }'
curl -s -X POST http://localhost:8080/v1/repas -H 'Content-Type: application/json' \
  -d '{ "date": "2026-09-25", "creneau": "MIDI", "portions": 4, "libelle": "Restes" }'
curl -s "http://localhost:8080/v1/repas?dateDebut=2026-09-21&dateFin=2026-09-27"
```

Ces contraintes sont aussi posées en base (migration `V2__repas_et_recettes.sql`) : unicité `(date_repas, creneau)`, `check` recette XOR libellé, `check` portions et quantités > 0.

## Liste de courses et garde-manger (`ShoppingListService`, `ShoppingListAggregator`, `PantryService`)

Une seule liste, partagée par la famille (migration `V3__liste_de_courses.sql`).

```bash
curl -s -X POST http://localhost:8080/v1/courses/generer -H 'Content-Type: application/json' \
  -d '{ "dateDebut": "2026-09-25", "dateFin": "2026-10-02" }'
curl -s -X POST http://localhost:8080/v1/courses/articles -H 'Content-Type: application/json' -d '{ "nom": "Papier toilette" }'
curl -s -X PATCH http://localhost:8080/v1/courses/articles/3 -H 'Content-Type: application/json' -d '{ "achete": true }'
```

- **Agrégation** (`ShoppingListAggregator`, calcul pur) : les ingrédients des repas de la période sont **proratisés** aux portions du repas (`PortionCalculator`), puis additionnés par ingrédient (nom normalisé) et **famille d'unité** : g et kg, ml et l se convertissent (affichage en kg / l dès 1 000) ; les autres unités ne s'additionnent qu'avec elles-mêmes. Unités incompatibles (2 pièces et 200 g d'oignon) → **deux lignes**, jamais une somme fausse. Les repas en libellé libre sont ignorés. Chaque ligne garde ses **repas d'origine** (id, date, créneau, nom de la recette : `sources`).
- **Régénération** : une ligne générée est retrouvée par sa clé (`cle_generation` = nom normalisé + famille d'unité). Quantité et repas d'origine sont mis à jour, les nouveaux ingrédients ajoutés, les lignes dont plus aucun repas de la période n'a besoin supprimées. Les **articles manuels** et les **statuts** (acheté, déjà à la maison) sont conservés.
- **Supprimer une ligne générée**, ou **vider les achetés**, la **retire** (`retire = true`) au lieu de l'effacer : sinon la régénération suivante la ferait revenir comme à acheter. Elle est effacée pour de bon quand plus aucun repas n'en a besoin. Un article manuel est effacé tout de suite.
- **Ligne générée modifiée** (PUT) : marquée `modifie` ; la régénération garde son nom, sa quantité et son unité (mais met à jour ses repas d'origine, et la retire si plus aucun repas n'en a besoin).
- **Garde-manger** (`pantry_item`, initialisé avec sel, poivre, huile d'olive et sucre) : à la génération, une nouvelle ligne dont le nom normalisé y figure arrive **« déjà à la maison »**. L'ajout d'un article marque aussi les lignes existantes de même nom. La correspondance est exacte (« huile » ne couvre pas « huile d'olive »).
- **Rayon** : celui de l'ingrédient (ligne générée, ou article manuel dont le nom correspond à un ingrédient connu).

## Routines (`RoutineService`, `RoutineTemplates`)

Tableaux de routine des enfants (« Mijn ochtendroutine », « Ma routine du soir ») : une liste d'étapes illustrées à cocher chaque jour (migration `V5__routines.sql`).

- **Routine** : membre, nom, sous-titre, type (`MORNING`, `EVENING`, `CUSTOM`), thème (`DAY`, `NIGHT`), jours actifs, plage horaire indicative (`heureDebut` / `heureFin`, les deux ou aucune), active, ordre. **Étapes** : position, libellé libre (dans la langue du parent), icône (id du catalogue du front), couleur pastel de la ligne.
- **Suivi du jour** (`routine_run`, unique par routine et par jour) : étapes cochées, `completedAt`, `rewardPlayed`. Les coches repartent de zéro chaque jour. La **fin est calculée par le serveur** : toutes les étapes cochées → `completedAt` renseigné ; décocher une étape l'efface. Seul **aujourd'hui** (horloge du serveur) peut être coché : pas de récompense en cochant la veille.
- **Récompense** : une partie de mini-jeu par routine terminée et par jour ; décocher puis recocher ne redonne pas de partie.
- **Modèles** (`RoutineTemplates`) : matin (lundi → vendredi, 6 h 30 – 8 h 30, 10 étapes) et soir (veilles de jour d'école, 18 h 30 – 20 h 30, 9 étapes), en **néerlandais et en français**. Appliquer un modèle en fait une copie modifiable. Les données de test donnent les deux routines à Léa (fr) et à Tom (nl).
- Supprimer un membre supprime ses routines et leur historique (clés étrangères `on delete cascade`).
- Pas de notion de parent / enfant ni d'authentification : la gestion est ouverte à tous (voir *Limites*).

## Météo et tenue conseillée (`MeteoService`, `TenueAdvisor`)

`GET /v1/meteo` renvoie, pour aujourd'hui et demain (ou `?jours=1` à `7` : la carte en affiche 2, le dialogue « Toute la semaine » 7), le ciel, les températures min/max, le **ressenti du matin**, le **ressenti de la journée**, le **risque de pluie** et la **tenue** conseillée (enum `Vetement`, dans l'ordre d'affichage) :

```json
{
  "lieu": "Bruxelles",
  "jours": [
    { "date": "2026-09-25", "ciel": "NUAGEUX", "temperatureMin": 14.5, "temperatureMax": 25.3,
      "ressentiMatin": 12.3, "ressentiJournee": 23.5, "risquePluie": 0,
      "tenue": ["T_SHIRT", "PULL", "VESTE", "PANTALON"], "superposer": true }
  ]
}
```

- **Source** : [Open-Meteo](https://open-meteo.com) (gratuit, sans clé), **7 jours** en un seul appel (`OpenMeteoClient.previsionSemaine()`), dans le fuseau configuré. Client `RestClient`, délais 3 s connexion / 5 s lecture.
- **Valeurs retenues** (règle, puis repli si la valeur horaire manque) :
  - ressenti du matin = ressenti horaire à `heure-depart` (sinon température min) ;
  - ressenti de la journée = ressenti horaire max entre 10 h et 18 h (sinon température max) ;
  - risque de pluie = max horaire entre `heure-depart` et 18 h (sinon valeur journalière).
- **Règles** (m = ressenti du matin, j = ressenti de la journée ; seuils = constantes de `TenueAdvisor`) :
  - T-shirt toujours ; pull si m < 15 ou j < 18 ;
  - manteau si m < 8, sinon imperméable s'il pleut (risque ≥ 50 % ou ciel bruine/pluie/neige/orage), sinon veste si m < 13 ;
  - short si j ≥ 22 et m ≥ 15, sinon pantalon ;
  - écharpe si m ≤ 7, bonnet si m ≤ 5, gants si m ≤ 3 ;
  - bottes si ≥ 5 mm de précipitations ou neige ; casquette et crème solaire si UV ≥ 5 ;
  - `superposer` : pull conseillé et j − m ≥ 8 (on pourra l'enlever l'après-midi).
- **Cache** : la prévision des 7 jours est gardée en mémoire `meteo.cache` (30 min) et partagée par toutes les valeurs de `jours` (`MeteoService.meteo(nbJours)` en renvoie les premiers jours), jamais au-delà du jour (fuseau de `meteo.fuseau`). Si Open-Meteo ne répond pas, la prévision **du jour** en cache est resservie ; sans elle, **503** (`ProblemDetail`). La prévision de la veille n'est jamais resservie.

| Variable | Défaut | Rôle |
|---|---|---|
| `METEO_LIEU` | `Bruxelles` | nom affiché |
| `METEO_LATITUDE` / `METEO_LONGITUDE` | `50.85` / `4.35` | coordonnées (centre de Bruxelles) |
| `METEO_FUSEAU` | `Europe/Brussels` | fuseau des prévisions et du changement de jour |
| `METEO_HEURE_DEPART` | `8` | heure de départ à l'école (0-23) |
| `METEO_CACHE` | `30m` | durée du cache (`Duration` Spring : `15m`, `1h`…) |
| `METEO_BASE_URL` | `https://api.open-meteo.com` | URL de l'API |

> Le dépôt est **public** : ne committez pas les coordonnées exactes du domicile, passez-les par `METEO_LATITUDE` / `METEO_LONGITUDE` (2 décimales ≈ 1 km suffisent).

## Structure

```
com.family.agenda
├── entity/      FamilyMember, Reminder, RecurrenceRule, AgendaEntry, Recipe, RecipeIngredient, Ingredient, Meal,
│                ShoppingList, ShoppingItem (+ ShoppingItemSource), PantryItem + enums
├── dto/         records de requête/réponse (+ validation de cohérence des dates et de la récurrence), Ciel, Vetement
├── mapper/      MapStruct (Entity <-> DTO)
├── repository/  Spring Data JPA
├── service/     AgendaService (génération/gestion), RecurrenceCalculator (calcul pur),
│                AgendaQueryService (jour/mois/année), ReminderService, FamilyMemberService,
│                MeteoService (cache), OpenMeteoClient, TenueAdvisor (règles de tenue, pur),
│                RecipeService, IngredientService, MealService, PortionCalculator (prorata, pur),
│                ShoppingListService, ShoppingListAggregator (agrégation, pur), PantryService
├── controller/  AgendaController, ReminderController, FamilyMemberController, MeteoController,
│                RecipeController, IngredientController, MealController, ShoppingListController, PantryController
├── scheduler/   AgendaExtensionScheduler
├── exception/   GlobalExceptionHandler (@RestControllerAdvice) : 400 / 404 / 409 (ConflictException) / 503
└── config/      versioning d'API, OpenAPI, propriétés, données de test
```

## Versions et compatibilité (Spring Boot 4.1)

| Composant | Version | Remarque |
|---|---|---|
| Spring Boot | **4.1.1** | dernière stable (4.2 n'existe qu'en milestone) |
| Spring Framework / Hibernate / Jackson | 7.0.9 / 7.4.5 / 3.1.5 | gérés par le BOM Boot |
| springdoc-openapi | **3.1.1** | ligne 3.x, celle qui cible Boot 4 (bâtie sur Boot 4.1.0) ; la 2.x cible Boot 3 |
| MapStruct | **1.6.3** | dernière stable ; la 1.7.0 n'existe qu'en Beta. Non gérée par le BOM |
| Lombok | 1.18.46 | gérée par le BOM ; compatible JDK 25 |

Breaking changes rencontrés :

- **Starters modulaires** : `spring-boot-starter-web` → `spring-boot-starter-webmvc` ; les tests ont leurs propres starters (`spring-boot-starter-webmvc-test`, `...-data-jpa-test`) et `@AutoConfigureMockMvc` a déménagé dans `org.springframework.boot.webmvc.test.autoconfigure`.
- **Jackson 3** : le databind vit dans `tools.jackson.*`, mais les annotations (`@JsonProperty`…) restent dans `com.fasterxml.jackson.annotation`. Le support `java.time` est intégré et les dates ne sont plus écrites en timestamps par défaut. **Attention** : springdoc/swagger-core embarque toujours Jackson 2, les deux versions coexistent sur le classpath (sans conflit constaté).
- **Versioning d'API natif** (`WebMvcConfigurer.configureApiVersioning`) :
  - le parser par défaut n'accepte que `1`, `1.2`… et **refuse `v1`** → `WebConfig` fournit un parser qui tolère le préfixe `v` ;
  - la version est le 1er segment du chemin ; les contrôleurs déclarent `@RequestMapping(path = "/agenda", version = "1")` et le préfixe `/{version}` est ajouté globalement (limité au package `controller`, pour ne pas toucher aux contrôleurs de springdoc) ; `/v2/...` répond 400 ;
  - springdoc publie les chemins comme `/1/agenda` : `OpenApiConfig` les réécrit en `/v1/agenda` pour que « Try it out » fonctionne.
- **MapStruct + Lombok** : `lombok-mapstruct-binding` et l'ordre des `annotationProcessorPaths` sont indispensables (configurés dans le pom). MapStruct est en mode strict : un champ non mappé casse la compilation.

## Limites et pistes

- **DEPLACE** ne change que le statut (le PATCH n'accepte pas de nouvelle date, conformément au besoin). L'occurrence garde sa date d'origine.
- **Fuseau** : les dates sont des `LocalDateTime` (heure locale de la famille), sans fuseau.
- **Sécurité** : aucune authentification (backend d'agenda familial en réseau de confiance).
- **Job nocturne multi-instances** : sans verrou distribué (ShedLock), deux instances exécuteraient le job simultanément ; la contrainte d'unicité évite les doublons mais l'une des deux transactions échouerait (loggé).
- La vue annuelle compte toutes les entrées, y compris annulées.
- **Routines** : la gestion (mode parent) n'est pas protégée, faute de comptes ou de code parent. Le « jour » est celui de l'horloge du serveur : un serveur dans un autre fuseau que la famille décalerait le changement de jour.
- **Liste de courses** : une ligne achetée ou retirée le reste à la régénération même si la quantité nécessaire augmente (un repas ajouté après les courses) ; il faut alors la décocher. Pas de conversion entre unités « de cuisine » (cuillères, pincées) et masses. Le rayon d'un ingrédient n'est pas encore modifiable par l'API.
