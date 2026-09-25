/*
 * Registre des cartes de la page Mobile (panneau latéral de l'agenda).
 *
 * Ajouter une carte :
 *   1. créer son composant standalone. Il est affiché par NgComponentOutlet, donc sans inputs ni outputs : il lit
 *      ses données dans des services, ou dans AgendaCardsContext pour celles de l'agenda (voir cards/tasks-card.ts) ;
 *   2. ajouter une entrée ci-dessous (id unique, titre traduit avec $localize, icône Material, ordre).
 * Rien d'autre à modifier : la page Mobile affiche les cartes triées par `order` et crée leur ancre.
 */
import { WeatherCard } from '../weather/weather-card';
import { MealsCard } from './cards/meals-card';
import { TasksCard } from './cards/tasks-card';
import { DashboardCard } from './dashboard-card';

export const DASHBOARD_CARDS: readonly DashboardCard[] = [
  {
    id: 'weather',
    title: $localize`:@@dashboard.card.weather:Météo`,
    icon: 'wb_sunny',
    component: WeatherCard,
    order: 10,
  },
  {
    id: 'tasks',
    title: $localize`:@@dashboard.card.tasks:Tâches`,
    icon: 'checklist',
    component: TasksCard,
    order: 20,
  },
  {
    id: 'meals',
    title: $localize`:@@dashboard.card.meals:Repas`,
    icon: 'restaurant',
    component: MealsCard,
    order: 30,
  },
];

/** Cartes actives, dans l'ordre d'affichage. */
export function enabledDashboardCards(cards: readonly DashboardCard[] = DASHBOARD_CARDS): DashboardCard[] {
  return cards.filter((card) => card.enabled !== false).sort((a, b) => a.order - b.order);
}
