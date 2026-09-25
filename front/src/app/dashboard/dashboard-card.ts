import { Type } from '@angular/core';

/** Une carte de la page Mobile. Les cartes sont déclarées dans `dashboard-cards.ts`. */
export interface DashboardCard {
  /** Identifiant stable : ancre de la carte (`MobilePanel.open(id)`) ; unique dans le registre. */
  id: string;
  /** Titre court (déjà traduit), utilisé par la barre d'ancres et les lecteurs d'écran. */
  title: string;
  /** Nom d'une icône Material Symbols, affichée dans la barre d'ancres. */
  icon: string;
  /** Composant standalone de la carte, créé sans inputs : il obtient ses données par injection. */
  component: Type<unknown>;
  /** Position dans la page, croissante. */
  order: number;
  /** `false` masque la carte sans la retirer du registre. */
  enabled?: boolean;
}
