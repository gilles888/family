import { MeteoJourDTO } from '../api-client';

export type Clothing = MeteoJourDTO.TenueEnum;
export type Sky = MeteoJourDTO.CielEnum;

/** Emoji + libellé court : la carte météo s'adresse aussi aux enfants qui ne lisent pas encore. */
export interface WeatherLabel {
  emoji: string;
  label: string;
}

export const WEATHER_LABELS: Record<Clothing | Sky, WeatherLabel> = {
  T_SHIRT: { emoji: '👕', label: $localize`:@@clothing.tShirt:T-shirt` },
  PULL: { emoji: '👚', label: $localize`:@@clothing.pull:Pull` },
  VESTE: { emoji: '🧥', label: $localize`:@@clothing.veste:Veste` },
  MANTEAU: { emoji: '🧥', label: $localize`:@@clothing.manteau:Manteau` },
  IMPERMEABLE: { emoji: '☔', label: $localize`:@@clothing.impermeable:Imperméable` },
  SHORT: { emoji: '🩳', label: $localize`:@@clothing.short:Short` },
  PANTALON: { emoji: '👖', label: $localize`:@@clothing.pantalon:Pantalon` },
  BONNET: { emoji: '🧶', label: $localize`:@@clothing.bonnet:Bonnet` },
  ECHARPE: { emoji: '🧣', label: $localize`:@@clothing.echarpe:Écharpe` },
  GANTS: { emoji: '🧤', label: $localize`:@@clothing.gants:Gants` },
  BOTTES: { emoji: '👢', label: $localize`:@@clothing.bottes:Bottes` },
  CASQUETTE: { emoji: '🧢', label: $localize`:@@clothing.casquette:Casquette` },
  CREME_SOLAIRE: { emoji: '🧴', label: $localize`:@@clothing.cremeSolaire:Crème solaire` },

  SOLEIL: { emoji: '☀️', label: $localize`:@@sky.soleil:Soleil` },
  ECLAIRCIES: { emoji: '⛅', label: $localize`:@@sky.eclaircies:Éclaircies` },
  NUAGEUX: { emoji: '☁️', label: $localize`:@@sky.nuageux:Nuageux` },
  BROUILLARD: { emoji: '🌫️', label: $localize`:@@sky.brouillard:Brouillard` },
  BRUINE: { emoji: '🌦️', label: $localize`:@@sky.bruine:Bruine` },
  PLUIE: { emoji: '🌧️', label: $localize`:@@sky.pluie:Pluie` },
  NEIGE: { emoji: '🌨️', label: $localize`:@@sky.neige:Neige` },
  ORAGE: { emoji: '⛈️', label: $localize`:@@sky.orage:Orage` },
};

/** Libellés partagés par la carte et le dialogue semaine. */
export const TODAY_LABEL = $localize`:@@weather.today:Aujourd'hui`;
export const TOMORROW_LABEL = $localize`:@@weather.tomorrow:Demain`;
