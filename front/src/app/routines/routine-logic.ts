import { RoutineDTO, RoutineRunDTO } from '../api-client';

type WeekDay = RoutineDTO.JoursEnum;

const WEEK_DAYS: WeekDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** Jour de la semaine (format du backend) d'une date. */
export function weekDay(date: Date): WeekDay {
  return WEEK_DAYS[date.getDay()];
}

/** Routines à proposer à l'enfant ce jour-là : actives et prévues ce jour de la semaine, dans l'ordre. */
export function routinesOfDay(routines: RoutineDTO[], date: Date): RoutineDTO[] {
  const day = weekDay(date);
  return routines.filter((r) => r.active && (r.jours ?? []).includes(day));
}

/** « 06:30:00 » ou « 06:30 » → minutes depuis minuit. */
function minutes(time: string | null | undefined): number | null {
  if (!time) {
    return null;
  }
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Routine du moment : celle dont la plage horaire contient l'heure actuelle ; sinon matin avant midi, soir à partir
 * de 15 h ; sinon la première.
 */
export function currentRoutine(routines: RoutineDTO[], now: Date): RoutineDTO | undefined {
  const time = now.getHours() * 60 + now.getMinutes();
  const inRange = routines.find((r) => {
    const [start, end] = [minutes(r.heureDebut), minutes(r.heureFin)];
    return start !== null && end !== null && time >= start && time <= end;
  });
  if (inRange) {
    return inRange;
  }
  const type = now.getHours() < 12 ? 'MORNING' : now.getHours() >= 15 ? 'EVENING' : undefined;
  return routines.find((r) => r.type === type) ?? routines[0];
}

export interface Progress {
  done: number;
  total: number;
}

export function progress(routine: RoutineDTO): Progress {
  const ids = new Set((routine.etapes ?? []).map((s) => s.id));
  const done = (routine.etat?.etapesCochees ?? []).filter((id) => ids.has(id)).length;
  return { done, total: ids.size };
}

/** État après avoir coché / décoché une étape, en attendant la réponse du serveur (même règle de fin). */
export function toggledRun(routine: RoutineDTO, stepId: number): RoutineRunDTO {
  const run = routine.etat ?? {};
  const checked = new Set(run.etapesCochees ?? []);
  if (!checked.delete(stepId)) {
    checked.add(stepId);
  }
  const ids = (routine.etapes ?? []).map((s) => s.id!);
  const terminee = ids.length > 0 && ids.every((id) => checked.has(id));
  return { ...run, etapesCochees: [...checked], terminee, termineeLe: terminee ? run.termineeLe : null };
}
