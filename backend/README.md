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
./mvnw test                     # 37 tests (récurrences, scénarios de bout en bout, tenue conseillée, cache météo)
./mvnw package && java -jar target/family-agenda-0.0.1-SNAPSHOT.jar
```

| | URL |
|---|---|
| API | http://localhost:8080/v1/... |
| **Swagger UI** | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |

Au démarrage en `dev`, un `CommandLineRunner` crée 4 membres (Maman, Papa, Léa, Tom) et 5 reminders (natation hebdo, football mardi+jeudi avec date de fin,
prise de sang ponctuelle, dentiste, anniversaire annuel). Les dates sont **relatives à aujourd'hui**, l'agenda est donc immédiatement rempli :

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
| `DDL_AUTO` | `update` | stratégie Hibernate (voir *Limites*) |
| `AGENDA_HORIZON_MONTHS` | `6` | fenêtre de génération des occurrences (tous profils) |
| `AGENDA_EXTENSION_CRON` | `0 0 2 * * *` | horaire du job de prolongation (cron Spring à 6 champs) |
| `AGENDA_SEED_ENABLED` | `false` | charger les données de test en prod |
| `SWAGGER_UI_ENABLED` | `true` | désactiver Swagger UI |
| `APP_TIMEZONE` | `Europe/Paris` | fuseau JDBC |
| `METEO_*` | Bruxelles | lieu de la carte météo (tous profils, voir *Météo et tenue conseillée*) |

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
| GET | `/v1/meteo` | météo d'aujourd'hui et de demain, avec la tenue conseillée pour les enfants (503 si indisponible) |

Les erreurs sont au format RFC 9457 (`ProblemDetail`) ; les erreurs de validation ajoutent `errors` (champ → message), ex. `errors.dateHeureFin`, `errors["recurrence.dateFin"]`.

## Règles de génération (`AgendaService`)

- **Création** : toutes les occurrences depuis `dateHeureDebut` jusqu'à l'horizon (aujourd'hui + 6 mois, ou début + 6 mois si le reminder démarre plus tard). Un reminder qui démarre dans le passé génère aussi ses entrées passées.
- **Récurrence** : `DAILY`, `WEEKLY` (jours choisis ; vide = jour de la date de début ; semaines ISO comptées depuis le lundi de la semaine de début), `MONTHLY`, `YEARLY`, avec `intervalle`. Fin : `dateFin` (incluse) **ou** `nombreOccurrences` (la 1re comprise) — pas les deux ; aucune des deux = sans fin (borné par la fenêtre).
  Le calcul repart toujours de la date de début : pas de dérive en fin de mois (31 janv. → 28 févr. → 31 mars).
- **Modification (PUT)** : les entrées **futures** sont réconciliées avec la nouvelle définition — supprimées si elles n'existent plus, créées si elles manquent. Une occurrence future qui reste valide **garde son statut** (une séance annulée à la main reste annulée). Les entrées **passées ne sont jamais touchées**.
- **Suppression (DELETE)** : les entrées futures sont supprimées. Si des entrées passées existent, le reminder est **archivé** (`actif = false`, invisible dans l'API) pour qu'elles gardent leur titre ; sinon il est supprimé pour de bon.
- **Job nocturne** (`AgendaExtensionScheduler`) : pour chaque reminder récurrent actif non terminé, ajoute les occurrences manquantes jusqu'au nouvel horizon. Idempotent, ne supprime ni ne modifie rien ; un reminder en erreur n'empêche pas les autres. Une contrainte d'unicité `(reminder, date_heure)` garantit l'absence de doublons.
- **Suppression d'un membre** : il est retiré des reminders concernés (qui sont conservés).

## Météo et tenue conseillée (`MeteoService`, `TenueAdvisor`)

`GET /v1/meteo` renvoie, pour aujourd'hui et demain, le ciel, les températures min/max, le **ressenti du matin**, le **ressenti de la journée**, le **risque de pluie** et la **tenue** conseillée (enum `Vetement`, dans l'ordre d'affichage) :

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

- **Source** : [Open-Meteo](https://open-meteo.com) (gratuit, sans clé), 2 jours, dans le fuseau configuré. Client `OpenMeteoClient` (`RestClient`, délais 3 s connexion / 5 s lecture).
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
- **Cache** : la réponse est gardée en mémoire `meteo.cache` (30 min), jamais au-delà du jour (fuseau de `meteo.fuseau`). Si Open-Meteo ne répond pas, la prévision **du jour** en cache est resservie ; sans elle, **503** (`ProblemDetail`). La prévision de la veille n'est jamais resservie.

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
├── entity/      FamilyMember, Reminder, RecurrenceRule, AgendaEntry + enums
├── dto/         records de requête/réponse (+ validation de cohérence des dates et de la récurrence), Ciel, Vetement
├── mapper/      MapStruct (Entity <-> DTO)
├── repository/  Spring Data JPA
├── service/     AgendaService (génération/gestion), RecurrenceCalculator (calcul pur),
│                AgendaQueryService (jour/mois/année), ReminderService, FamilyMemberService,
│                MeteoService (cache), OpenMeteoClient, TenueAdvisor (règles de tenue, pur)
├── controller/  AgendaController, ReminderController, FamilyMemberController, MeteoController
├── scheduler/   AgendaExtensionScheduler
├── exception/   GlobalExceptionHandler (@RestControllerAdvice)
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

- **Schéma** : pas de Flyway/Liquibase. En prod, `DDL_AUTO=update` crée le schéma automatiquement ; pour une vraie exploitation, ajouter Flyway et passer à `validate`. Le profil prod n'a pas été exécuté contre un PostgreSQL réel (seuls H2 et les tests l'ont été).
- **DEPLACE** ne change que le statut (le PATCH n'accepte pas de nouvelle date, conformément au besoin). L'occurrence garde sa date d'origine.
- **Fuseau** : les dates sont des `LocalDateTime` (heure locale de la famille), sans fuseau.
- **Sécurité** : aucune authentification (backend d'agenda familial en réseau de confiance).
- **Job nocturne multi-instances** : sans verrou distribué (ShedLock), deux instances exécuteraient le job simultanément ; la contrainte d'unicité évite les doublons mais l'une des deux transactions échouerait (loggé).
- La vue annuelle compte toutes les entrées, y compris annulées.
