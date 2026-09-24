import { AgendaEntryDTO, MealRequest, RecipeIngredientRequest, RecurrenceRuleRequest, ReminderRequest } from '../api-client';

export type ReminderType = ReminderRequest.TypeEnum;
export type EntryStatus = AgendaEntryDTO.StatutEnum;
export type Frequency = RecurrenceRuleRequest.FrequenceEnum;
export type WeekDay = RecurrenceRuleRequest.JoursSemaineEnum;
export type IngredientUnit = RecipeIngredientRequest.UniteEnum;
export type MealSlot = MealRequest.CreneauEnum;

export const REMINDER_TYPES: ReminderType[] = Object.values(ReminderRequest.TypeEnum);
export const ENTRY_STATUSES: EntryStatus[] = Object.values(AgendaEntryDTO.StatutEnum);
export const FREQUENCIES: Frequency[] = Object.values(RecurrenceRuleRequest.FrequenceEnum);
/** Lundi -> dimanche ; les noms des jours s'affichent via DatePipe (voir WEEKDAY_REFERENCE_DATES). */
export const WEEK_DAYS: WeekDay[] = Object.values(RecurrenceRuleRequest.JoursSemaineEnum);
export const INGREDIENT_UNITS: IngredientUnit[] = Object.values(RecipeIngredientRequest.UniteEnum);
/** Dans l'ordre de la journée. */
export const MEAL_SLOTS: MealSlot[] = Object.values(MealRequest.CreneauEnum);

/** Dates de référence (lundi 1er janv. 2024 ...) pour obtenir le nom localisé d'un jour avec DatePipe/Intl. */
export const WEEKDAY_REFERENCE_DATES: Record<WeekDay, Date> = Object.fromEntries(
  WEEK_DAYS.map((day, i) => [day, new Date(2024, 0, 1 + i)]),
) as Record<WeekDay, Date>;

/** Enums métier du backend : seuls textes traduits à la main (les dates/jours/mois passent par DatePipe). */
export const TYPE_LABELS: Record<ReminderType, string> = {
  SPORT: $localize`:@@type.sport:Sport`,
  TEST_MEDICAL: $localize`:@@type.testMedical:Test médical`,
  RENDEZ_VOUS: $localize`:@@type.rendezVous:Rendez-vous`,
  AUTRE: $localize`:@@type.autre:Autre`,
};

export const STATUS_LABELS: Record<EntryStatus, string> = {
  PREVU: $localize`:@@status.prevu:Prévu`,
  COMPLETE: $localize`:@@status.complete:Terminé`,
  ANNULE: $localize`:@@status.annule:Annulé`,
  DEPLACE: $localize`:@@status.deplace:Déplacé`,
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: $localize`:@@frequency.daily:Tous les jours`,
  WEEKLY: $localize`:@@frequency.weekly:Toutes les semaines`,
  MONTHLY: $localize`:@@frequency.monthly:Tous les mois`,
  YEARLY: $localize`:@@frequency.yearly:Tous les ans`,
};

export const STATUS_ICONS: Record<EntryStatus, string> = {
  PREVU: 'schedule',
  COMPLETE: 'check_circle',
  ANNULE: 'cancel',
  DEPLACE: 'event_repeat',
};

/** Unités courtes, affichées après une quantité (« 400 g », « 2 c. à soupe »). */
export const UNIT_LABELS: Record<IngredientUnit, string> = {
  G: $localize`:@@unit.g:g`,
  KG: $localize`:@@unit.kg:kg`,
  ML: $localize`:@@unit.ml:ml`,
  L: $localize`:@@unit.l:l`,
  PIECE: $localize`:@@unit.piece:pièce(s)`,
  CUILLERE_SOUPE: $localize`:@@unit.cuillereSoupe:c. à soupe`,
  CUILLERE_CAFE: $localize`:@@unit.cuillereCafe:c. à café`,
  BOITE: $localize`:@@unit.boite:boîte(s)`,
  SACHET: $localize`:@@unit.sachet:sachet(s)`,
  PINCEE: $localize`:@@unit.pincee:pincée(s)`,
};

export const SLOT_LABELS: Record<MealSlot, string> = {
  PETIT_DEJEUNER: $localize`:@@slot.petitDejeuner:Petit-déjeuner`,
  MIDI: $localize`:@@slot.midi:Midi`,
  SOUPER: $localize`:@@slot.souper:Souper`,
};

/** En-têtes de colonnes de la carte « Repas de la semaine » (place réduite). */
export const SLOT_SHORT_LABELS: Record<MealSlot, string> = {
  PETIT_DEJEUNER: $localize`:@@slot.short.petitDejeuner:Matin`,
  MIDI: $localize`:@@slot.short.midi:Midi`,
  SOUPER: $localize`:@@slot.short.souper:Soir`,
};
