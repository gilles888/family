/** Utilitaires de dates en heure locale (le backend échange des LocalDate / LocalDateTime sans fuseau). */

const pad = (n: number) => String(n).padStart(2, '0');

/** yyyy-MM-dd */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** yyyy-MM-ddTHH:mm:ss */
export function toIsoDateTime(d: Date): string {
  return `${toIsoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** Minuit local de la date ISO (yyyy-MM-dd ou date-heure ISO). */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date-heure locale d'une chaîne ISO sans fuseau (yyyy-MM-ddTHH:mm[:ss]). */
export function parseIsoDateTime(iso: string): Date {
  const [y, mo, d] = iso.substring(0, 10).split('-').map(Number);
  const [h = 0, mi = 0] = iso.substring(11, 16).split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Ajoute des mois en gardant le jour, ramené au dernier jour du mois si nécessaire (31 janv. + 1 mois = 28 févr.). */
export function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay));
}

/** Lundi de la semaine de `d` (semaine ISO, comme le backend). */
export function startOfWeek(d: Date): Date {
  const offset = (d.getDay() + 6) % 7; // lundi = 0
  return addDays(startOfDay(d), -offset);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Date `date` avec l'heure de `time`. */
export function combine(date: Date, time: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
}

/**
 * Semaines (lundi -> dimanche) affichées pour un mois : elles couvrent tout le mois et sont
 * complétées par les jours des mois voisins. `month` est compris entre 1 et 12.
 */
export function buildMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const weeks: Date[][] = [];
  for (let weekStart = startOfWeek(first); weekStart <= last; weekStart = addDays(weekStart, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)));
  }
  return weeks;
}
