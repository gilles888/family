import { AgendaEntryDTO } from '../api-client';

export const DEFAULT_ENTRY_COLOR = '#3f51b5';

/** Couleur d'une entrée : celle de son premier membre (par ordre alphabétique), sinon une couleur neutre. */
export function entryColor(entry: AgendaEntryDTO): string {
  return entry.membres?.[0]?.couleur ?? DEFAULT_ENTRY_COLOR;
}

/** Noir ou blanc, selon la luminance du fond, pour un texte lisible sur `hex` (#rrggbb). */
export function contrastColor(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) {
    return '#ffffff';
  }
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1b1b1b' : '#ffffff';
}
