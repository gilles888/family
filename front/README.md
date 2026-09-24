# Agenda familial — Frontend Angular

Interface de l'agenda familial : **Angular 22**, **Angular Material 22**, SCSS, i18n natif (**fr** par défaut, **nl**).
Elle consomme l'API REST du backend Spring Boot (`../backend`) **exclusivement via un client TypeScript généré** à partir de sa spec OpenAPI.

## Démarrage rapide

Prérequis : **Node 24** (≥ 24.15), **JDK 11+** (nécessaire à `openapi-generator-cli`).

```bash
npm install
# 1. lancer le backend (voir ../backend/README.md) -> http://localhost:8080
# 2. lancer le frontend
npm start                # français    -> http://localhost:4200
npm run start:nl         # néerlandais -> http://localhost:4201  (facultatif)
npm test                 # tests unitaires (Vitest)
```

En développement, les appels `/v1/...` sont **relayés vers `http://localhost:8080`** par `proxy.conf.json` : pas de CORS à configurer. Si votre backend écoute ailleurs, modifiez la `target` de ce fichier.

Le sélecteur de langue (**FR / NL** dans l'en-tête) recharge l'application dans l'autre langue, sur la même page. Une langue = un build : en dev, il faut donc que les deux serveurs (`npm start` et `npm run start:nl`, dans deux terminaux) tournent pour basculer ; en production le sélecteur pointe vers `/fr/` et `/nl/`.

## Fonctionnalités

- **Agenda** en 4 modes (`mat-button-toggle-group`) : **Jour** (liste détaillée), **Semaine** (grille lundi → dimanche, entrées positionnées par jour et par heure, côte à côte si elles se chevauchent), **Mois** (grille), **Année** (12 mois cliquables avec compteurs par type).
- **Navigation** cohérente : les flèches avancent d'un jour, d'une semaine, d'un mois ou d'une année selon le mode ; « Aujourd'hui » revient à la date courante ; cliquer un jour ou un mois change de vue.
- **Filtre par membre** (`mat-chip-listbox`, avec les couleurs des membres) appliqué à toutes les vues.
- **Nouveau rappel / édition** (`mat-dialog`) : titre, description, type, membres, date (datepicker), heures (timepicker), interrupteur de récurrence et sous-formulaire (fréquence, intervalle, jours de la semaine, fin par date ou nombre d'occurrences).
- **Clic sur une entrée** : détail, changement de statut (Prévu / Terminé / Annulé / Déplacé — une seule occurrence est modifiée), modification ou suppression du rappel.
- **Membres** (`/membres`) : liste, ajout, modification, suppression.
- **Comment s'habiller ?** : carte en haut de la colonne des tâches (voir *Carte météo*).
- **Erreurs d'API** : un intercepteur affiche un message **traduit** dans un `mat-snack-bar` (réseau, 400, 404, 409, 5xx). Une requête qui affiche elle-même son erreur pose `SKIP_ERROR_NOTIFICATION` dans son `HttpContext` pour ne pas avoir de snack-bar.

## Carte météo (`src/app/weather/`)

La carte **« Comment s'habiller ? »** appelle `GET /v1/meteo` (`MeteoService.getMeteo` généré) et affiche deux colonnes, **Aujourd'hui** (fond `primary-container`) et **Demain** : ciel, max/min, 🌅 ressenti du matin, 💧 risque de pluie, et la **tenue conseillée** en tuiles (gros emoji + libellé court, pour les enfants qui ne lisent pas encore). Si un pull est conseillé et que l'après-midi est nettement plus chaud, la carte l'indique (« on pourra enlever le pull »).

- Le conseil (règles, seuils, lieu) est calculé **par le backend** : voir la section *Météo et tenue conseillée* de `../backend/README.md`. Le lieu se règle côté backend par les variables `METEO_*` (Bruxelles par défaut).
- Rechargement automatique toutes les **30 min** (le backend garde lui-même la prévision en cache 30 min).
- En cas d'erreur (503 si Open-Meteo est injoignable et qu'aucune prévision du jour n'est en cache) : message discret dans la carte et bouton **Réessayer**, sans snack-bar (`SKIP_ERROR_NOTIFICATION`).
- Emojis et libellés : `weather-labels.ts` (identifiants `@@clothing.*`, `@@sky.*`).

## Le client API généré (`src/app/api-client/`)

> **Ne modifiez jamais ce dossier à la main** : il est entièrement écrasé à chaque génération.

Aucun service HTTP ni interface n'est écrit à la main : tous les composants utilisent les services et modèles générés (`AgendaService`, `RemindersService`, `MembresService`, `MeteoService`, `AgendaEntryDTO`, `ReminderRequest`…). Le code généré est **committé** ; il se régénère **manuellement** quand l'API du backend change.

### Régénérer le client après un changement du backend

1. Démarrer le backend (`../backend`, `./mvnw spring-boot:run`) : sa spec est exposée sur `http://localhost:8080/v3/api-docs`.
2. Lancer :
   ```bash
   npm run generate-api
   ```
   La configuration (générateur `typescript-angular`, version d'openapi-generator, options) est dans **`openapitools.json`**.
3. Corriger les erreurs de compilation éventuelles dans le code applicatif (`npx ng build`), puis committer le client régénéré.

Variantes :

| Script | Rôle |
|---|---|
| `npm run generate-api` | génère depuis l'URL du backend (`http://localhost:8080/v3/api-docs`, modifiable dans `openapitools.json`, clé `api`) |
| `npm run fetch-api-spec` | enregistre la spec dans `openapi/family-agenda.json` (instantané versionné) |
| `npm run generate-api:file` | génère depuis cet instantané, sans backend (clé `api-file`) |

Le client est **configuré dans `src/app/app.config.ts`** : `provideApi(environment.apiBasePath)`. Le `basePath` vient de `src/environments/environment.ts` (dev) et `environment.prod.ts` (prod).

### Points d'attention (constatés à la mise en place)

- **Noms des services** : ils viennent des `@Tag` du backend (`Agenda`, `Reminders`, `Membres`, `Meteo` → `AgendaService`, `RemindersService`, `MembresService`, `MeteoService`). Renommer un tag renomme le service généré.
- **Noms des méthodes** : ils viennent des `operationId` du backend, fixés explicitement (`getAgendaMois`, `createReminder`, `updateEntryStatus`…). Sans cela, springdoc produit `list_1`, `get_1`… Ne les retirez pas.
- **Ce que la spec doit garantir** — deux défauts du backend, corrigés à la source, qui cassaient le client :
  - les contrôleurs déclarent `produces = application/json` ; sans cela la spec annonce `*/*`, le générateur ne reconnaît pas du JSON et **renvoie des `Blob`** au lieu d'objets ;
  - un tag ne doit être déclaré qu'une fois, sinon la validation du générateur échoue (`attribute tags.X is repeated`).
- **Ensembles** : le générateur type les collections uniques en `Set<T>`, or `JSON.stringify(new Set([1]))` donne `{}`. `openapitools.json` force donc `typeMappings: { set: Array }`.
- `provideApi(...)` (générateur ≥ 7.x) remplace le `ApiModule.forRoot(...)` historique : c'est l'équivalent standalone, `api.module.ts` est généré mais inutilisé.

## Configuration par environnement

| Fichier | Rôle |
|---|---|
| `src/environments/environment.ts` | dev : `apiBasePath: ''` (appels relatifs + proxy), URLs des serveurs de langue (`localhost:4200` / `4201`) |
| `src/environments/environment.prod.ts` | prod : `apiBasePath: ''` (backend derrière le même domaine), langues sous `/fr/` et `/nl/` |

En production, deux façons de joindre le backend :

- **Recommandé** : un reverse proxy (nginx, Caddy…) sert `dist/.../browser` et relaie `/v1` vers le backend. Rien à changer.
- Backend sur un autre domaine : mettre son URL dans `apiBasePath` de `environment.prod.ts` **et** activer le CORS côté backend (non fait aujourd'hui).

## Build par langue

```bash
npm run build       # production : toutes les langues -> dist/family-agenda-front/browser/{fr,nl}/
npm run build:fr    # une seule langue
npm run build:nl
```

Chaque langue est un build complet (`<base href="/fr/">`, `<html lang="fr">`…). Le serveur web doit renvoyer `index.html` **de la langue** pour les routes inconnues, ex. avec nginx :

```nginx
location /fr/ { try_files $uri /fr/index.html; }
location /nl/ { try_files $uri /nl/index.html; }
location /v1/ { proxy_pass http://backend:8080; }
```

`i18nMissingTranslation` vaut `error` : **un build échoue si une traduction manque** (aucun texte non traduit n'atteint la production).

## Internationalisation

- **Langue source : français**. Les textes sont dans les templates (`i18n="@@identifiant"`) ou dans le code (`` $localize`:@@identifiant:Texte` ``). Chaque message a un **identifiant explicite** (`@@agenda.today`…) : modifier le texte français ne casse pas les traductions.
- **Dates, jours, mois, heures** : jamais traduits à la main. Ils passent par `DatePipe`/`Intl` avec la locale du build (`Lun.` / `Ma`, `septembre` / `september`…). La saisie d'une date au clavier suit l'ordre de la locale (`25/09/2026` en fr, `25-09-2026` en nl), grâce à `LocaleDateAdapter`.
- **Libellés des enums** du backend (types, statuts, fréquences) : `src/app/shared/labels.ts` ; vêtements et ciel : `src/app/weather/weather-labels.ts`.
- Fichiers : `src/locale/messages.fr.xlf` (source, **généré**) et `src/locale/messages.nl.xlf` (traduit).
- Limite : les libellés internes d'Angular Material (ex. les libellés d'accessibilité du datepicker) restent en anglais, Material ne les fournit pas traduits.

### Après avoir ajouté ou modifié un texte

```bash
npm run extract-i18n      # met à jour src/locale/messages.fr.xlf
```

Reporter ensuite chaque nouvelle entrée `<trans-unit>` dans `messages.nl.xlf` en ajoutant un `<target>` après le `<source>`, et supprimer celles qui n'existent plus. Le build échoue tant qu'une traduction manque.

### Ajouter une nouvelle langue (exemple : `de`)

1. **`angular.json`** → `projects.family-agenda-front.i18n.locales` :
   ```json
   "locales": {
     "nl": { "translation": "src/locale/messages.nl.xlf" },
     "de": { "translation": "src/locale/messages.de.xlf" }
   }
   ```
2. **Fichier de traduction** : copier `src/locale/messages.nl.xlf` en `messages.de.xlf`, changer `target-language="nl"` en `"de"`, et traduire chaque `<target>`.
3. **Sélecteur de langue** : ajouter `{ code: 'de', label: 'Deutsch' }` à `LANGUAGES` dans `src/app/app.ts`.
4. **URLs** : ajouter `de` à `localeUrls` dans `environment.ts` (ex. `http://localhost:4202/`) et `environment.prod.ts` (`/de/`).
5. **Dev** *(facultatif)* : dans `angular.json`, ajouter une configuration `build` `de` (`"localize": ["de"]`) et une configuration `serve` `de` (`"port": 4202, "prebundle": false`) sur le modèle de `nl`, puis un script `start:de`.
6. Vérifier : `npm run build` (produit `dist/.../de/`). Aucun autre code à modifier : dates, jours et mois suivent automatiquement la nouvelle locale.

## Structure

```
src/
├── app/
│   ├── api-client/        code GÉNÉRÉ (openapi-generator) — ne pas modifier
│   ├── agenda/            page agenda, vues jour / semaine / mois / année, dialogue de statut
│   ├── reminders/         dialogue de création / édition d'un rappel
│   ├── family-members/    gestion des membres
│   ├── weather/           carte « Comment s'habiller ? » (météo + tenue), libellés emoji
│   ├── shared/            intercepteur d'erreurs, notifications, pipe enumLabel, libellés, utilitaires de dates
│   ├── app.config.ts      providers (client API, HttpClient + intercepteur, adaptateur de dates)
│   └── app.ts             en-tête, navigation, sélecteur de langue
├── environments/          environment.ts / environment.prod.ts
└── locale/                messages.fr.xlf, messages.nl.xlf
openapi/                   instantané de la spec du backend
openapitools.json          configuration du générateur
proxy.conf.json            proxy de dev vers le backend
```

## Limites connues

- Le sélecteur de langue recharge la page : les filtres et la date affichée ne sont pas conservés (seule la route l'est).
- Le modèle du backend n'a pas de notion de « toute la journée » : chaque entrée a une heure ; sans heure de fin, la vue Semaine affiche 45 min.
- Le statut « Déplacé » ne change que le statut (le backend ne gère pas de nouvelle date).
- Les icônes et la police Roboto sont chargées depuis Google Fonts (`src/index.html`) ; hors ligne, les icônes s'affichent comme du texte.
