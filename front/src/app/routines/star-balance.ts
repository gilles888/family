import { RoutineHistoryDTO, StarPenaltyDTO } from '../api-client';

/** Étoiles gagnées (une par routine terminée) et retirées (par un parent) sur une période. */
export interface StarCount {
  earned: number;
  removed: number;
}

/** Étoiles d'un jour de l'historique. */
export function dayStars(day: RoutineHistoryDTO): StarCount {
  return {
    earned: day.routinesTerminees?.length ?? 0,
    removed: (day.retraits ?? []).reduce((sum, r) => sum + (r.nombre ?? 0), 0),
  };
}

/** Total d'une période. */
export function periodStars(days: RoutineHistoryDTO[]): StarCount {
  return days.map(dayStars).reduce((a, b) => ({ earned: a.earned + b.earned, removed: a.removed + b.removed }), { earned: 0, removed: 0 });
}

/** Solde affiché : gagnées moins retirées, jamais négatif. */
export function balance({ earned, removed }: StarCount): number {
  return Math.max(0, earned - removed);
}

/** Texte au survol / au toucher d'un jour avec des étoiles retirées : « Dispute (2) · Autre : porte claquée (1) ». */
export function penaltiesSummary(penalties: StarPenaltyDTO[], labels: Record<string, string>): string {
  return penalties
    .map((p) => `${labels[p.motif!] ?? p.motif}${p.commentaire ? ` : ${p.commentaire}` : ''} (−${p.nombre})`)
    .join(' · ');
}
