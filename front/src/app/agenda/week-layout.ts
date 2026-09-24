import { AgendaEntryDTO } from '../api-client';
import { parseIsoDateTime, isSameDay } from '../shared/date-utils';

export const HOUR_PX = 48;
/** Durée affichée pour une entrée sans heure de fin. */
export const DEFAULT_DURATION_MIN = 45;
const MIN_DURATION_MIN = 25;
const DAY_MIN = 24 * 60;

export interface PlacedEntry {
  entry: AgendaEntryDTO;
  /** Position verticale / hauteur en pixels dans la colonne du jour. */
  top: number;
  height: number;
  /** Colonne (0..lanes-1) parmi les entrées qui se chevauchent. */
  lane: number;
  lanes: number;
}

/**
 * Positionne les entrées d'un jour dans une colonne horaire : verticalement selon l'heure,
 * côte à côte lorsqu'elles se chevauchent. Une entrée qui déborde sur le lendemain est coupée à minuit.
 */
export function layoutDay(entries: AgendaEntryDTO[]): PlacedEntry[] {
  const items = entries
    .map((entry) => {
      const start = parseIsoDateTime(entry.dateHeure!);
      const startMin = start.getHours() * 60 + start.getMinutes();
      let endMin = startMin + DEFAULT_DURATION_MIN;
      if (entry.dateHeureFin) {
        const end = parseIsoDateTime(entry.dateHeureFin);
        endMin = isSameDay(start, end) ? end.getHours() * 60 + end.getMinutes() : DAY_MIN;
      }
      endMin = Math.min(DAY_MIN, Math.max(endMin, startMin + MIN_DURATION_MIN));
      return { entry, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const placed: PlacedEntry[] = [];
  let cluster: { entry: AgendaEntryDTO; startMin: number; endMin: number; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    for (const c of cluster) {
      placed.push({
        entry: c.entry,
        top: (c.startMin / 60) * HOUR_PX,
        height: ((c.endMin - c.startMin) / 60) * HOUR_PX,
        lane: c.lane,
        lanes: laneEnds.length,
      });
    }
    cluster = [];
    laneEnds = [];
  };

  for (const item of items) {
    if (item.startMin >= clusterEnd) {
      flush();
    }
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    cluster.push({ ...item, lane });
    clusterEnd = Math.max(clusterEnd < item.startMin ? item.startMin : clusterEnd, item.endMin);
  }
  flush();
  return placed;
}
