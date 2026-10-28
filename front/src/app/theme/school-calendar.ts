/**
 * Calendrier scolaire : grandes vacances et rentrée de chaque année. Les calendriers de la Fédération Wallonie-Bruxelles
 * et de la Communauté flamande diffèrent depuis la réforme : choisir la communauté de la famille avec COMMUNAUTE.
 */
export type Communaute = 'FWB' | 'VL';

/** À régler : communauté dont on suit le calendrier. */
export const COMMUNAUTE: Communaute = 'FWB';

export interface GrandesVacances {
  /** Premier jour des grandes vacances. */
  debut: Date;
  /** Dernier jour des grandes vacances. */
  fin: Date;
  /** Jour de la rentrée de septembre (ou de fin août) qui suit. */
  rentree: Date;
}

export interface SchoolCalendar {
  /** Grandes vacances de l'été de l'année civile donnée, et rentrée qui les suit. */
  vacances(annee: number): GrandesVacances;
}

/** Date locale à minuit, à partir d'une chaîne yyyy-MM-dd. */
const d = (iso: string): Date => {
  const [y, m, j] = iso.split('-').map(Number);
  return new Date(y, m - 1, j);
};

interface EntreeAnnee {
  debut: string;
  fin: string;
  rentree: string;
}

/**
 * Une entrée par été (clé = année civile des vacances), pour chaque communauté.
 * 2027 = fin de l'année scolaire 2026-2027 ; 2028 = fin de 2027-2028.
 * Tous ces chiffres sont à vérifier sur le calendrier officiel de la communauté concernée.
 */
const ANNEES: Record<number, Record<Communaute, EntreeAnnee>> = {
  // À VÉRIFIER : fin de l'année scolaire 2026-2027
  2027: {
    FWB: { debut: '2027-07-03', fin: '2027-08-29', rentree: '2027-08-30' }, // À VÉRIFIER
    VL: { debut: '2027-07-01', fin: '2027-08-31', rentree: '2027-09-01' }, // À VÉRIFIER
  },
  // À VÉRIFIER : fin de l'année scolaire 2027-2028
  2028: {
    FWB: { debut: '2028-07-08', fin: '2028-08-27', rentree: '2028-08-28' }, // À VÉRIFIER
    VL: { debut: '2028-07-01', fin: '2028-08-31', rentree: '2028-09-01' }, // À VÉRIFIER
  },
};

/** Valeurs de repli quand l'année n'est pas dans le tableau : 1er juillet au 31 août, rentrée le 1er septembre. */
function repli(annee: number): GrandesVacances {
  return { debut: new Date(annee, 6, 1), fin: new Date(annee, 7, 31), rentree: new Date(annee, 8, 1) };
}

export function schoolCalendar(communaute: Communaute = COMMUNAUTE): SchoolCalendar {
  return {
    vacances(annee: number): GrandesVacances {
      const e = ANNEES[annee]?.[communaute];
      return e ? { debut: d(e.debut), fin: d(e.fin), rentree: d(e.rentree) } : repli(annee);
    },
  };
}

export const SCHOOL_CALENDAR: SchoolCalendar = schoolCalendar();
