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
- **Recettes** (`/recettes`) et **repas de la semaine** : voir *Repas et recettes*.
- **Courses** (`/courses`) : liste de courses générée depuis les repas, garde-manger (voir *Liste de courses*).
- **Comment s'habiller ?** : carte en haut de la colonne des tâches (voir *Carte météo*).
- **Page Mobile** : panneau qui glisse depuis la droite (languette ou swipe) et regroupe les cartes Météo, Tâches, Repas et Courses (voir *Page Mobile*).
- **Erreurs d'API** : un intercepteur affiche un message **traduit** dans un `mat-snack-bar` (réseau, 400, 404, 409, 5xx). Une requête qui affiche elle-même son erreur pose `SKIP_ERROR_NOTIFICATION` dans son `HttpContext` pour ne pas avoir de snack-bar.

## Repas et recettes (`src/app/recipes/`, `src/app/meals/`)

- **Recettes** (`/recettes`, `RecipesPage`) : liste avec recherche, création / modification (`RecipeDialog`) et suppression. Une recette a un nom, une description courte, des portions de référence, un temps de préparation (facultatif), des instructions et des lignes d'ingrédients (nom, quantité, unité). Le nom d'ingrédient est **autocomplété** sur les ingrédients existants (`GET /v1/ingredients`) ; un nom inconnu crée l'ingrédient à l'enregistrement. Un même ingrédient saisi deux fois est signalé dès la saisie, avec la même comparaison que le backend (`ingredient-names.ts` : sans casse, accents ni ligatures, « Œufs » = « oeufs »).
- **Repas** (`MealDialog`) : date, créneau (petit-déjeuner, midi, souper), portions (par défaut : une par membre de la famille), puis **une recette** (recherche) **ou une saisie libre** (« Restes », « Resto » en un clic). Un seul repas par créneau : le conflit est expliqué dans le dialogue.
- **Deux modes d'affichage**, au choix dans la barre de filtres de l'agenda (« Dans l'agenda » / « En carte ») :
  - **En carte** (par défaut) : carte **Repas de la semaine** (`MealsWeekCard`) de la **page Mobile** (choisir ce mode l'ouvre sur cette carte), grille lundi → dimanche × créneaux, semaine précédente / suivante ; case vide = ajouter, repas = l'ouvrir ;
  - **Dans l'agenda** : les repas s'affichent dans les vues jour, semaine et mois comme des entrées 🍽️ de couleur dédiée (`--mat-sys-tertiary*`), à l'heure fictive de leur créneau (8 h, 12 h, 18 h 30 — `meal-entries.ts`) ; le filtre « 🍽️ Repas » les masque, le bouton « Repas » en ajoute un au jour affiché.

  Il n'y a pas de préférences utilisateur côté backend : ce choix et le filtre sont gardés **dans le navigateur** (`localStorage`, `MealDisplayPreference`), avec des valeurs par défaut si le stockage est indisponible.
- **Fiche recette** (`RecipeSheetDialog`) : au clic sur un repas lié à une recette (ou depuis la page Recettes), ingrédients **recalculés au prorata** des portions du repas (`GET /v1/recettes/{id}/fiche?portions=`), ajustables en −/+, temps et instructions en étapes ; bouton « Modifier le repas ». Un repas en saisie libre ouvre directement sa modification.
- Libellés des unités et des créneaux : `src/app/shared/labels.ts` (`@@unit.*`, `@@slot.*`), via le pipe `enumLabel`.

## Liste de courses (`src/app/shopping/`)

Page **`/courses`** (`ShoppingPage`), pensée d'abord pour le téléphone en magasin. Les règles (agrégation, régénération, garde-manger) sont côté backend : voir *Liste de courses et garde-manger* dans `../backend/README.md`.

- **Générer / Régénérer** : repas d'une période (sélecteur de dates ; par défaut la période de la dernière génération si elle n'est pas passée, sinon aujourd'hui → +7 jours). Régénérer garde les articles manuels et les coches.
- **Ajout rapide** en haut de liste : un nom puis Entrée (le champ garde le focus pour enchaîner) ; quantité et unité facultatives derrière le bouton « Quantité et unité » (icône de réglages).
- **Lignes** de 56 px au moins, groupées par **rayon** de l'ingrédient (ordre du magasin, « Sans rayon » en dernier), par ordre alphabétique dans un rayon (`groupByAisle`, `shopping-list.ts`). Toute la ligne coche l'article **acheté** (barré, pas supprimé) ; la coche s'affiche tout de suite, sans attendre le réseau. Sous le nom : les repas d'origine (« pour : Lasagnes lun., Soupe jeu. »).
- **Menu d'une ligne** : modifier (`ShoppingItemDialog` ; une ligne venant des repas garde ensuite la quantité saisie), déjà à la maison, ajouter au garde-manger, supprimer.
- **Déjà à la maison** : section repliée en bas de liste, chaque article se remet dans les achats en un tap.
- **Vider les achetés** (bouton du résumé ou menu ⋮) ; **Garde-manger** (menu ⋮, `PantryDialog`) : ajouter / retirer les ingrédients qu'on a toujours.
- `ShoppingStore` (service racine) garde la liste pour la page **et** la carte Courses de la page Mobile : un chargement, modifications reportées localement.

## Page Mobile (`src/app/dashboard/`)

Panneau affiché par la page agenda (`<app-mobile-page />`) : plein écran sous 1000 px, 480 px au-delà (avec un fond assombri), défilement vertical, et une barre d'ancres (icônes) qui fait défiler jusqu'à chaque carte.

- **Ouvrir / fermer** : languette au bord droit (le chevron pivote, elle suit le bord gauche de la page ouverte), swipe vers la gauche depuis la languette ou le bord droit de l'écran (bande de 20 px, écrans tactiles seulement), swipe vers la droite sur la page, clic sur le fond, **Échap**, bouton **retour** du navigateur ou du téléphone.
- **Gestes** (`mobile-page.ts`) : Pointer Events, sans bibliothèque. Le sens est décidé après 10 px (horizontal = glissement, vertical = défilement des cartes, grâce à `touch-action: pan-y`). Au relâchement, le glissement aboutit au-delà de 40 % de la largeur ou si le geste est rapide (> 0,5 px/ms), sinon la page revient. Animation 250 ms en `transform` uniquement, désactivée avec `prefers-reduced-motion`.
- **État** : `MobilePanelService` (signal `isOpen`), synchronisé avec le paramètre d'URL `?panel=mobile`. `open(cardId?)` ouvre la page et fait défiler jusqu'à une carte, ex. `open('meals')`.
- **Données** : les cartes réutilisent ce que la page a déjà chargé, sans second appel à l'API : les tâches et les repas via `AgendaCardsContext` (fourni par `AgendaPage`, qui ouvre aussi les dialogues), la météo via `WeatherStore` (partagé par les deux cartes météo). Les cartes ne sont créées qu'à la première ouverture.

### Ajouter une carte

1. Créer un composant standalone. Il est affiché par `NgComponentOutlet`, donc **sans inputs ni outputs** : il obtient ses données par injection (un service, ou `AgendaCardsContext` pour celles de l'agenda ; voir `cards/tasks-card.ts`, un adaptateur de 20 lignes autour d'un composant existant).
2. Ajouter une entrée dans `DASHBOARD_CARDS` (`dashboard-cards.ts`) : `id` unique, `title` traduit avec `$localize`, `icon` (nom d'une icône **Material Icons**), `order`, et `enabled: false` pour la masquer.
3. `npm run extract-i18n`, puis traduire le titre dans `messages.nl.xlf`.

### Tester le tactile (Chrome DevTools)

1. `npm start`, ouvrir http://localhost:4200, puis DevTools (F12) → **Toggle device toolbar** (Ctrl+Maj+M) et choisir un appareil (ex. Pixel 7, iPad) : le curseur devient un « doigt » et les événements sont de type `touch`.
2. Glisser depuis la languette ou tout près du bord droit vers la gauche : la page suit le doigt ; relâcher avant 40 % la fait revenir, un geste vif l'ouvre. Glisser vers la droite sur la page la ferme ; un glissement vertical fait défiler les cartes.
3. Recharger la page après avoir changé d'appareil : la bande du bord droit n'existe que si le navigateur annonce un écran tactile (`any-pointer: coarse`).
4. Vérifier l'URL (`?panel=mobile`), le bouton retour et Échap. **Rendering** → *Emulate CSS media feature prefers-reduced-motion* coupe les animations.

## Carte météo (`src/app/weather/`)

La carte **« Comment s'habiller ? »** appelle `GET /v1/meteo?jours=2` (`MeteoService.getMeteo(2)` généré) et affiche deux colonnes, **Aujourd'hui** (fond `primary-container`) et **Demain** : ciel, max/min, 🌅 ressenti du matin, 💧 risque de pluie, et la **tenue conseillée** en tuiles (gros emoji + libellé court, pour les enfants qui ne lisent pas encore). Si un pull est conseillé et que l'après-midi est nettement plus chaud, la carte l'indique (« on pourra enlever le pull »).

- **Toute la semaine** : le bouton de l'en-tête (visible une fois la météo chargée) ouvre `WeekWeatherDialog`, qui charge `GET /v1/meteo?jours=7` : les 7 prochains jours, aujourd'hui compris (« Aujourd'hui », « Demain », puis le nom du jour dans la langue du build), en grille responsive (1 colonne sur mobile, 2 à 3 au-delà de 600 px), avec un rappel : au-delà de 3 jours, les prévisions sont moins fiables. Le paramètre `jours` va de 1 à 7 (2 par défaut) ; le backend fait un seul appel à Open-Meteo pour la carte et le dialogue.
- Une journée (ciel, températures, ressenti, pluie, tuiles, « on pourra enlever le pull ») est affichée par le composant réutilisable `weather-day` (`day`, `label`, `highlighted`).
- Le conseil (règles, seuils, lieu) est calculé **par le backend** : voir la section *Météo et tenue conseillée* de `../backend/README.md`. Le lieu se règle côté backend par les variables `METEO_*` (Bruxelles par défaut).
- Rechargement automatique toutes les **30 min** (le backend garde lui-même la prévision en cache 30 min). La prévision est gardée par `WeatherStore` : la carte de la page principale et celle de la page Mobile partagent le même appel.
- En cas d'erreur (503 si Open-Meteo est injoignable et qu'aucune prévision du jour n'est en cache) : message discret dans la carte (ou le dialogue) et bouton **Réessayer**, sans snack-bar (`SKIP_ERROR_NOTIFICATION`).
- Emojis et libellés : `weather-labels.ts` (identifiants `@@clothing.*`, `@@sky.*`, et `@@weather.today` / `@@weather.tomorrow` partagés par la carte et le dialogue).

## Le client API généré (`src/app/api-client/`)

> **Ne modifiez jamais ce dossier à la main** : il est entièrement écrasé à chaque génération.

Aucun service HTTP ni interface n'est écrit à la main : tous les composants utilisent les services et modèles générés (`AgendaService`, `RemindersService`, `MembresService`, `MeteoService`, `RecettesService`, `IngredientsService`, `RepasService`, `AgendaEntryDTO`, `ReminderRequest`…). Le code généré est **committé** ; il se régénère **manuellement** quand l'API du backend change.

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

- **Noms des services** : ils viennent des `@Tag` du backend (`Agenda`, `Reminders`, `Membres`, `Meteo`, `Recettes`, `Ingredients`, `Repas` → `AgendaService`, `RemindersService`, `MembresService`, `MeteoService`, `RecettesService`, `IngredientsService`, `RepasService`). Renommer un tag renomme le service généré.
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
- **Libellés des enums** du backend (types, statuts, fréquences, unités, créneaux) : `src/app/shared/labels.ts` ; vêtements et ciel : `src/app/weather/weather-labels.ts`.
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
│   ├── recipes/           page Recettes, dialogue recette, fiche recette (prorata)
│   ├── meals/             carte « Repas de la semaine », dialogue repas, affichage dans l'agenda
│   ├── dashboard/         page Mobile : registre des cartes, panneau, gestes, état (MobilePanelService)
│   ├── shopping/          page Courses, ShoppingStore, dialogues article et garde-manger
│   ├── weather/           carte « Comment s'habiller ? », dialogue semaine, journée (weather-day), libellés emoji
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
