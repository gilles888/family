import { FamilyMemberDTO } from '../api-client';
import { SCHOOL_CALENDAR, SchoolCalendar } from './school-calendar';

export type SeasonId =
  | 'halloween'
  | 'saint-nicolas'
  | 'noel'
  | 'carnaval'
  | 'paques'
  | 'ete'
  | 'rentree'
  | 'printemps'
  | 'automne'
  | 'hiver'
  | 'anniversaire';

/** Aucun thème de saison : couleurs de base de l'application. */
export type ThemeId = SeasonId | 'neutre';

/** approche : l'événement se prépare ; jourJ : il est là (ou vient de passer, tant que dure la fenêtre). */
export type SeasonPhase = 'approche' | 'jourJ';

export interface SeasonResult {
  id: SeasonId;
  /** null pour une saison de fond. */
  phase: SeasonPhase | null;
  /** Membres fêtés (thème « anniversaire »). */
  membres?: FamilyMemberDTO[];
  /** Jours avant la date clé (0 le jour même) ; absent pour une saison de fond ou une fois la date passée. */
  joursRestants?: number;
}

// =====================================================================================================================
// RÉGLAGES — tout ce qui se règle est ici.
// Un thème = une date clé + une fenêtre autour : active de (date clé − avant) à (date clé + après), en jours.
// =====================================================================================================================

/** À partir de combien de jours avant la date clé on passe de la phase « approche » à la phase « jourJ ». */
export const JOURS_JOUR_J = 3;

/** Anniversaire : anticipation, en jours (la phase « jourJ » n'est que le jour même). */
export const ANNIVERSAIRE_AVANT = 7;

interface SeasonRule {
  id: Exclude<SeasonId, 'printemps' | 'automne' | 'hiver' | 'anniversaire'>;
  kind: 'evenement' | 'saison';
  dateCle: (annee: number, calendrier: SchoolCalendar) => Date;
  /** Jours d'anticipation. */
  avant: number;
  /** Jours après la date clé. */
  apres: number | ((annee: number, calendrier: SchoolCalendar) => number);
}

export const REGLES: readonly SeasonRule[] = [
  { id: 'halloween', kind: 'evenement', dateCle: (a) => new Date(a, 9, 31), avant: 21, apres: 1 },
  { id: 'saint-nicolas', kind: 'evenement', dateCle: (a) => new Date(a, 11, 6), avant: 21, apres: 0 },
  { id: 'noel', kind: 'evenement', dateCle: (a) => new Date(a, 11, 25), avant: 18, apres: 12 },
  { id: 'carnaval', kind: 'evenement', dateCle: (a) => ajouterJours(paques(a), -47), avant: 10, apres: 0 }, // Mardi gras
  { id: 'paques', kind: 'evenement', dateCle: (a) => paques(a), avant: 21, apres: 1 },
  // Début des grandes vacances, jusqu'à leur fin
  {
    id: 'ete',
    kind: 'saison',
    dateCle: (a, cal) => cal.vacances(a).debut,
    avant: 14,
    apres: (a, cal) => joursEntre(cal.vacances(a).debut, cal.vacances(a).fin),
  },
  { id: 'rentree', kind: 'evenement', dateCle: (a, cal) => cal.vacances(a).rentree, avant: 14, apres: 10 },
];

/** Saisons de fond, quand aucun événement n'est actif : mois (1-12) et jour de début. Hiver court jusqu'au 28/29 février. */
export const SAISONS_DE_FOND: readonly { id: 'printemps' | 'ete' | 'automne' | 'hiver'; mois: number }[] = [
  { id: 'printemps', mois: 3 },
  { id: 'ete', mois: 6 }, // couleurs seulement
  { id: 'automne', mois: 9 },
  { id: 'hiver', mois: 12 },
];

// =====================================================================================================================

const MS_JOUR = 86_400_000;

/** Numéro de jour du calendrier (insensible à l'heure d'été). */
function numeroJour(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_JOUR);
}

export function joursEntre(debut: Date, fin: Date): number {
  return numeroJour(fin) - numeroJour(debut);
}

function ajouterJours(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

/** Dimanche de Pâques (méthode de Meeus/Butcher, calendrier grégorien). */
export function paques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(annee, mois - 1, jour);
}

/** Date de naissance yyyy-MM-dd → [année, mois (1-12), jour]. */
function parseNaissance(iso: string): [number, number, number] {
  const [y, m, j] = iso.substring(0, 10).split('-').map(Number);
  return [y, m, j];
}

/** Anniversaire de l'année donnée. Né un 29 février : fêté le 28 février les années non bissextiles. */
export function anniversaireEn(dateNaissance: string, annee: number): Date {
  const [, mois, jour] = parseNaissance(dateNaissance);
  if (mois === 2 && jour === 29 && new Date(annee, 1, 29).getMonth() !== 1) {
    return new Date(annee, 1, 28);
  }
  return new Date(annee, mois - 1, jour);
}

/** Âge atteint à la date de l'anniversaire de l'année de `date`. */
export function ageAnniversaire(dateNaissance: string, annee: number): number {
  return annee - parseNaissance(dateNaissance)[0];
}

/** Prochain anniversaire (aujourd'hui compris) parmi les membres ayant une date de naissance. */
export function prochainAnniversaire(date: Date, membres: FamilyMemberDTO[]): { membres: FamilyMemberDTO[]; jours: number } | null {
  let meilleur: { membres: FamilyMemberDTO[]; jours: number } | null = null;
  for (const membre of membres) {
    if (!membre.dateNaissance) {
      continue;
    }
    for (const annee of [date.getFullYear(), date.getFullYear() + 1]) {
      const jours = joursEntre(date, anniversaireEn(membre.dateNaissance, annee));
      if (jours < 0) {
        continue;
      }
      if (!meilleur || jours < meilleur.jours) {
        meilleur = { membres: [membre], jours };
      } else if (jours === meilleur.jours) {
        meilleur.membres.push(membre);
      }
      break;
    }
  }
  return meilleur;
}

interface Candidat {
  id: SeasonId;
  cle: Date;
  debut: Date;
  fin: Date;
  membres?: FamilyMemberDTO[];
}

function candidats(date: Date, membres: FamilyMemberDTO[], calendrier: SchoolCalendar): Candidat[] {
  const annee = date.getFullYear();
  const resultat: Candidat[] = [];
  // Année précédente, courante et suivante : les fenêtres peuvent chevaucher le nouvel an
  for (let a = annee - 1; a <= annee + 1; a++) {
    for (const regle of REGLES) {
      const cle = regle.dateCle(a, calendrier);
      const apres = typeof regle.apres === 'function' ? regle.apres(a, calendrier) : regle.apres;
      resultat.push({ id: regle.id, cle, debut: ajouterJours(cle, -regle.avant), fin: ajouterJours(cle, apres) });
    }
    const parJour = new Map<number, Candidat>();
    for (const membre of membres) {
      if (!membre.dateNaissance) {
        continue;
      }
      const cle = anniversaireEn(membre.dateNaissance, a);
      const existant = parJour.get(numeroJour(cle));
      if (existant) {
        existant.membres!.push(membre);
      } else {
        parJour.set(numeroJour(cle), { id: 'anniversaire', cle, debut: ajouterJours(cle, -ANNIVERSAIRE_AVANT), fin: cle, membres: [membre] });
      }
    }
    resultat.push(...parJour.values());
  }
  return resultat.filter((c) => numeroJour(c.debut) <= numeroJour(date) && numeroJour(date) <= numeroJour(c.fin));
}

function saisonDeFond(date: Date): SeasonId {
  const mois = date.getMonth() + 1;
  // La dernière saison commencée dans l'année ; avant le 1er mars, c'est encore l'hiver
  const commencees = SAISONS_DE_FOND.filter((s) => s.mois <= mois);
  return commencees.length ? commencees[commencees.length - 1].id : 'hiver';
}

/**
 * Thème du jour : un anniversaire le jour même l'emporte ; sinon l'événement actif dont la date clé est la plus proche
 * dans le futur (ou aujourd'hui), à défaut le plus récemment passé ; sinon la saison de fond.
 */
export function seasonFor(date: Date, membres: FamilyMemberDTO[], calendrier: SchoolCalendar = SCHOOL_CALENDAR): SeasonResult {
  const aujourdhui = numeroJour(date);
  const actifs = candidats(date, membres, calendrier);

  const fete = actifs.find((c) => c.id === 'anniversaire' && numeroJour(c.cle) === aujourdhui);
  const gagnant =
    fete ??
    actifs
      .filter((c) => numeroJour(c.cle) >= aujourdhui)
      // à date clé égale, l'anniversaire passe avant
      .sort((x, y) => numeroJour(x.cle) - numeroJour(y.cle) || Number(y.id === 'anniversaire') - Number(x.id === 'anniversaire'))[0] ??
    actifs.sort((x, y) => numeroJour(y.cle) - numeroJour(x.cle))[0];

  if (!gagnant) {
    return { id: saisonDeFond(date), phase: null };
  }
  const restants = numeroJour(gagnant.cle) - aujourdhui;
  const seuil = gagnant.id === 'anniversaire' ? 1 : JOURS_JOUR_J + 1;
  const phase: SeasonPhase = restants >= seuil ? 'approche' : 'jourJ';
  return {
    id: gagnant.id,
    phase,
    ...(gagnant.membres ? { membres: gagnant.membres } : {}),
    ...(restants >= 0 ? { joursRestants: restants } : {}),
  };
}

/** Tous les thèmes saisonniers, dans l'ordre de l'année (écran de choix). */
export const SEASON_IDS: readonly SeasonId[] = [
  'printemps', 'carnaval', 'paques', 'ete', 'rentree', 'automne', 'halloween', 'saint-nicolas', 'noel', 'hiver', 'anniversaire',
];

/** HALLOWEEN, SAINT_NICOLAS… (API) → halloween, saint-nicolas… */
export function toSeasonId(theme: string): SeasonId {
  return theme.toLowerCase().replace(/_/g, '-') as SeasonId;
}

/** halloween, saint-nicolas… → HALLOWEEN, SAINT_NICOLAS… (API) */
export function toApiTheme(id: SeasonId): string {
  return id.toUpperCase().replace(/-/g, '_');
}
