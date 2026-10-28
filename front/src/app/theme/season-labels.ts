import { SeasonId, SeasonPhase, ThemeId } from './seasons';

/** Nom d'un thème, pour les écrans de réglage. */
export function seasonLabel(id: ThemeId): string {
  switch (id) {
    case 'halloween':
      return $localize`:@@season.name.halloween:Halloween`;
    case 'saint-nicolas':
      return $localize`:@@season.name.saintNicolas:Saint-Nicolas`;
    case 'noel':
      return $localize`:@@season.name.noel:Noël`;
    case 'carnaval':
      return $localize`:@@season.name.carnaval:Carnaval`;
    case 'paques':
      return $localize`:@@season.name.paques:Pâques`;
    case 'ete':
      return $localize`:@@season.name.ete:Été`;
    case 'rentree':
      return $localize`:@@season.name.rentree:Rentrée`;
    case 'printemps':
      return $localize`:@@season.name.printemps:Printemps`;
    case 'automne':
      return $localize`:@@season.name.automne:Automne`;
    case 'hiver':
      return $localize`:@@season.name.hiver:Hiver`;
    case 'anniversaire':
      return $localize`:@@season.name.anniversaire:Anniversaire`;
    case 'neutre':
      return $localize`:@@season.name.neutre:Sans thème`;
  }
}

export function seasonPhaseLabel(phase: SeasonPhase): string {
  return phase === 'approche' ? $localize`:@@season.phase.approche:approche` : $localize`:@@season.phase.jourJ:en cours`;
}

/** Souhait affiché sur le tableau de bord pendant l'événement (anniversaire : voir BirthdayMessage). */
export function seasonGreeting(id: SeasonId): string {
  switch (id) {
    case 'halloween':
      return $localize`:@@season.greeting.halloween:Joyeux Halloween !`;
    case 'saint-nicolas':
      return $localize`:@@season.greeting.saintNicolas:Joyeuse Saint-Nicolas !`;
    case 'noel':
      return $localize`:@@season.greeting.noel:Joyeux Noël !`;
    case 'carnaval':
      return $localize`:@@season.greeting.carnaval:Joyeux carnaval !`;
    case 'paques':
      return $localize`:@@season.greeting.paques:Joyeuses Pâques !`;
    case 'ete':
      return $localize`:@@season.greeting.ete:Bonnes vacances !`;
    case 'rentree':
      return $localize`:@@season.greeting.rentree:Bonne rentrée !`;
    case 'printemps':
      return $localize`:@@season.greeting.printemps:Bon printemps !`;
    case 'automne':
      return $localize`:@@season.greeting.automne:Bel automne !`;
    case 'hiver':
      return $localize`:@@season.greeting.hiver:Bon hiver !`;
    case 'anniversaire':
      return $localize`:@@season.greeting.anniversaire:Joyeux anniversaire !`;
  }
}
