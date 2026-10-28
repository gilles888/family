import { DOCUMENT } from '@angular/common';
import { HttpContext } from '@angular/common/http';
import { Injectable, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, forkJoin, tap } from 'rxjs';
import { FamilyMemberDTO, MembresService, ParametresService, ThemeSettingsDTO, ThemeSettingsRequest } from '../api-client';
import { AuthService } from '../auth/auth.service';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { SCHOOL_CALENDAR } from './school-calendar';
import { SEASON_IDS, SeasonId, SeasonPhase, SeasonResult, ThemeId, prochainAnniversaire, seasonFor, toSeasonId } from './seasons';

/** Le thème est un confort : une erreur de chargement ne doit jamais déranger l'utilisateur. */
const QUIET = { context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true) };

/** Préférence de l'appareil (thème ou rien = automatique). */
const CLE_PREFERENCE = 'famille.theme';

/** Thème affiché, pour les décors et les messages. */
export interface ThemeActif {
  id: ThemeId;
  phase: SeasonPhase | null;
  membres?: FamilyMemberDTO[];
  joursRestants?: number;
}

const NEUTRE: ThemeActif = { id: 'neutre', phase: null };

/**
 * Thème de l'application. Priorité : 1. réglage de la famille (thème forcé, ou désactivé) ;
 * 2. préférence de l'appareil (parent, ou enfant si la famille l'autorise) ; 3. calcul d'après la date.
 */
@Injectable({ providedIn: 'root' })
export class SeasonThemeService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly parametres = inject(ParametresService);
  private readonly membresApi = inject(MembresService);
  private readonly document = inject(DOCUMENT);

  private readonly maintenant = signal(new Date());
  private readonly reglageSignal = signal<ThemeSettingsDTO | null>(null);
  private readonly membresSignal = signal<FamilyMemberDTO[]>([]);
  private readonly preference = signal<ThemeId | null>(this.lirePreference());
  private readonly apercu = signal<ThemeActif | null>(null);
  private minuit: ReturnType<typeof setTimeout> | undefined;

  readonly reglage = this.reglageSignal.asReadonly();
  readonly membres = this.membresSignal.asReadonly();
  readonly preferenceAppareil = this.preference.asReadonly();

  /** Thème qu'aurait l'application en mode automatique (sans thème forcé ni préférence). */
  readonly automatique = computed<SeasonResult>(() => {
    const fetes = this.auth.isLoggedIn() && (this.reglageSignal()?.anniversairesActifs ?? true) ? this.membresSignal() : [];
    return seasonFor(this.maintenant(), fetes, SCHOOL_CALENDAR);
  });

  /** Prochain anniversaire (pour l'écran de réglage). */
  readonly prochainAnniversaire = computed(() => prochainAnniversaire(this.maintenant(), this.membresSignal()));

  /** La préférence de l'appareil s'applique-t-elle, et peut-elle être choisie ? */
  readonly choixAppareilPossible = computed(() => {
    const reglage = this.reglageSignal();
    return this.auth.isLoggedIn() && reglage !== null && reglage.mode === 'AUTO' && (this.auth.isParent() || reglage.enfantsPeuventChoisir === true);
  });

  private readonly base = computed<ThemeActif>(() => {
    const reglage = this.reglageSignal();
    if (this.auth.isLoggedIn() && reglage) {
      if (reglage.mode === 'OFF') {
        return NEUTRE;
      }
      if (reglage.mode === 'FORCE' && reglage.theme) {
        const id = toSeasonId(reglage.theme);
        if (id !== 'anniversaire') {
          return { id, phase: 'jourJ' };
        }
        const membre = this.membresSignal().find((m) => m.id === reglage.membreId);
        if (membre) {
          return { id, phase: 'jourJ', membres: [membre], joursRestants: 0 };
        }
      }
    }
    const choisi = this.preference();
    if (choisi && this.choixAppareilPossible()) {
      return choisi === 'neutre' ? NEUTRE : { id: choisi, phase: 'jourJ' };
    }
    return this.automatique();
  });

  /** Thème affiché (l'aperçu d'un écran de réglage passe avant tout). */
  readonly actif = computed<ThemeActif>(() => this.apercu() ?? this.base());

  constructor() {
    effect(() => {
      const theme = this.actif();
      const racine = this.document.documentElement;
      racine.dataset['season'] = theme.id;
      if (theme.phase) {
        racine.dataset['seasonPhase'] = theme.phase;
      } else {
        delete racine.dataset['seasonPhase'];
      }
    });
    // Connexion : on charge le réglage et les membres ; déconnexion : on les oublie
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        if (user && !user.doitChangerMotDePasse) {
          this.recharger();
        } else {
          this.reglageSignal.set(null);
          this.membresSignal.set([]);
        }
      });
    });
    this.document.addEventListener('visibilitychange', this.auRetour);
    this.planifierMinuit();
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('visibilitychange', this.auRetour);
    clearTimeout(this.minuit);
  }

  /** Relit la date, le réglage de la famille et les membres (un parent a pu changer le thème depuis un autre appareil). */
  recharger(): void {
    this.maintenant.set(new Date());
    if (!this.auth.isLoggedIn() || this.auth.mustChangePassword()) {
      return;
    }
    forkJoin({
      reglage: this.parametres.getThemeFamille('body', false, QUIET),
      membres: this.membresApi.listMembres('body', false, QUIET),
    }).subscribe({
      next: ({ reglage, membres }) => {
        this.reglageSignal.set(reglage);
        this.membresSignal.set(membres);
      },
      error: () => undefined,
    });
  }

  /** Parent : change le thème de toute la famille. */
  enregistrerFamille(request: ThemeSettingsRequest): Observable<ThemeSettingsDTO> {
    return (this.parametres.updateThemeFamille(request) as Observable<ThemeSettingsDTO>).pipe(
      tap((reglage) => {
        this.reglageSignal.set(reglage);
        this.apercu.set(null);
      }),
    );
  }

  /** Préférence de cet appareil ; null = automatique. */
  choisirPourAppareil(id: ThemeId | null): void {
    this.preference.set(id);
    try {
      if (id) {
        localStorage.setItem(CLE_PREFERENCE, id);
      } else {
        localStorage.removeItem(CLE_PREFERENCE);
      }
    } catch {
      // stockage indisponible (navigation privée…) : le choix ne vaut que pour cette session
    }
  }

  /** Aperçu en direct d'un thème ('auto' : celui de la date ; null : fin de l'aperçu, ex. fermer sans enregistrer). */
  previsualiser(id: SeasonId | 'neutre' | 'auto' | null, membre?: FamilyMemberDTO): void {
    if (id === null) {
      this.apercu.set(null);
    } else if (id === 'auto') {
      this.apercu.set(this.automatique());
    } else if (id === 'neutre') {
      this.apercu.set(NEUTRE);
    } else {
      this.apercu.set({ id, phase: 'jourJ', ...(id === 'anniversaire' && membre ? { membres: [membre], joursRestants: 0 } : {}) });
    }
  }

  private readonly auRetour = (): void => {
    if (this.document.visibilityState === 'visible') {
      this.recharger();
    }
  };

  /** À minuit, le thème du jour peut changer : on relit tout, puis on reprogramme. */
  private planifierMinuit(): void {
    const maintenant = new Date();
    const prochain = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1, 0, 0, 1);
    this.minuit = setTimeout(() => {
      this.recharger();
      this.planifierMinuit();
    }, prochain.getTime() - maintenant.getTime());
  }

  private lirePreference(): ThemeId | null {
    try {
      const valeur = localStorage.getItem(CLE_PREFERENCE);
      return valeur === 'neutre' || (SEASON_IDS as readonly string[]).includes(valeur ?? '') ? (valeur as ThemeId) : null;
    } catch {
      return null;
    }
  }
}
