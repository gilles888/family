import { HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, firstValueFrom, tap } from 'rxjs';
import { ConnexionService, MeDTO } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';

/** Les appels de connexion affichent eux-mêmes leurs erreurs (pas de snack-bar générique). */
const QUIET = { context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true) };

/**
 * Utilisateur connecté. La session est un cookie HttpOnly du backend : le front ne voit jamais de jeton, il
 * demande /v1/auth/me (une fois, au premier passage par une garde de route) pour savoir qui est connecté.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ConnexionService);
  private readonly current = signal<MeDTO | null>(null);
  private loading: Promise<MeDTO | null> | null = null;

  readonly user = this.current.asReadonly();
  readonly isLoggedIn = computed(() => this.current() !== null);
  readonly isParent = computed(() => this.current()?.role === 'PARENT');
  readonly isChild = computed(() => this.current()?.role === 'ENFANT');
  readonly mustChangePassword = computed(() => this.current()?.doitChangerMotDePasse === true);
  /** Nom affiché dans le menu : celui du membre lié, sinon l'identifiant. */
  readonly displayName = computed(() => this.current()?.membreNom ?? this.current()?.identifiant ?? '');

  /** Qui est connecté ? (une seule requête ; null si personne). */
  ensureLoaded(): Promise<MeDTO | null> {
    this.loading ??= firstValueFrom(this.api.getMe('body', false, QUIET)).then(
      (me) => this.set(me),
      () => this.set(null),
    );
    return this.loading;
  }

  login(identifiant: string, motDePasse: string, resterConnecte: boolean): Observable<MeDTO> {
    return this.api.login({ identifiant, motDePasse, resterConnecte }, 'body', false, QUIET).pipe(tap((me) => this.set(me)));
  }

  /** Déconnexion côté serveur ; côté front, l'utilisateur est oublié même si l'appel échoue. */
  logout(): Observable<unknown> {
    return this.api.logout('body', false, QUIET).pipe(finalize(() => this.clear()));
  }

  changePassword(ancienMotDePasse: string, nouveauMotDePasse: string): Observable<MeDTO> {
    return this.api.changePassword({ ancienMotDePasse, nouveauMotDePasse }, 'body', false, QUIET).pipe(tap((me) => this.set(me)));
  }

  /** Session expirée ou fermée (401) : l'utilisateur devra se reconnecter. */
  clear(): void {
    this.set(null);
  }

  /** Le backend exige un nouveau mot de passe (403 MOT_DE_PASSE_A_CHANGER). */
  requirePasswordChange(): void {
    const me = this.current();
    if (me) {
      this.set({ ...me, doitChangerMotDePasse: true });
    }
  }

  private set(me: MeDTO | null): MeDTO | null {
    this.current.set(me);
    this.loading = Promise.resolve(me);
    return me;
  }
}
