import { RoutineDTO, RoutineRequest, RoutineStepRequest, StarPenaltyDTO } from '../api-client';

export type RoutineType = RoutineDTO.TypeEnum;
export type RoutineTheme = RoutineDTO.ThemeEnum;

export const ROUTINE_TYPE_LABELS: Record<RoutineType, string> = {
  MORNING: $localize`:@@routine.type.morning:Matin`,
  EVENING: $localize`:@@routine.type.evening:Soir`,
  CUSTOM: $localize`:@@routine.type.custom:Autre moment`,
};

export const ROUTINE_THEME_LABELS: Record<RoutineTheme, string> = {
  DAY: $localize`:@@routine.theme.day:Jour`,
  NIGHT: $localize`:@@routine.theme.night:Nuit`,
};

/** Couleurs pastel des lignes (les mêmes que celles du backend, en alternance). */
export const ROUTINE_PASTELS = ['#FDE2E4', '#E2F0CB', '#FFF1C1', '#DBEAFE', '#EDE9FE', '#FCE7F3', '#DCFCE7', '#FFEDD5'];

/** « 06:30:00 » → « 06:30 » (champ <input type="time">). */
export function hhmm(time: string | null | undefined): string {
  return time ? time.substring(0, 5) : '';
}

/** Requête complète à partir d'une routine existante (ex. pour l'activer / la désactiver). */
export function toRoutineRequest(routine: RoutineDTO, changes: Partial<RoutineRequest> = {}): RoutineRequest {
  return {
    nom: routine.nom!,
    sousTitre: routine.sousTitre ?? undefined,
    type: routine.type!,
    theme: routine.theme!,
    jours: routine.jours ?? [],
    heureDebut: routine.heureDebut ? hhmm(routine.heureDebut) : undefined,
    heureFin: routine.heureFin ? hhmm(routine.heureFin) : undefined,
    active: routine.active,
    etapes: (routine.etapes ?? []).map(
      (s): RoutineStepRequest => ({ id: s.id, libelle: s.libelle!, icone: s.icone!, couleur: s.couleur }),
    ),
    ...changes,
  };
}

/** Création d'une copie indépendante d'une routine chez un membre (nouvelles étapes : sans id). */
export function copyRequest(routine: RoutineDTO, membreId: number, nom: string): RoutineRequest {
  const request = toRoutineRequest(routine, { membreId, nom });
  return { ...request, etapes: request.etapes?.map((s) => ({ ...s, id: undefined })) };
}

export type PenaltyReason = StarPenaltyDTO.MotifEnum;

/** Motifs d'un retrait d'étoiles (mêmes valeurs que le backend). */
export const PENALTY_REASON_LABELS: Record<PenaltyReason, string> = {
  TACHE_NON_FAITE: $localize`:@@penalty.reason.task:Tâche non faite`,
  MAUVAIS_COMPORTEMENT: $localize`:@@penalty.reason.behaviour:Mauvais comportement`,
  DISPUTE: $localize`:@@penalty.reason.quarrel:Dispute`,
  IMPOLITESSE: $localize`:@@penalty.reason.rudeness:Impolitesse`,
  AUTRE: $localize`:@@penalty.reason.other:Autre`,
};
