import { Provider, computed, signal } from '@angular/core';
import { MeDTO } from '../api-client';
import { AuthService } from './auth.service';

/** Utilisateur connecté simulé pour les tests de composants (aucun appel HTTP). */
export function provideFakeAuth(role: MeDTO.RoleEnum | null, overrides: Partial<MeDTO> = {}): Provider {
  const user = signal<MeDTO | null>(role ? { identifiant: role === 'PARENT' ? 'papa' : 'lea', role, membreId: 4, ...overrides } : null);
  return {
    provide: AuthService,
    useValue: {
      user,
      isLoggedIn: computed(() => user() !== null),
      isParent: computed(() => user()?.role === 'PARENT'),
      isChild: computed(() => user()?.role === 'ENFANT'),
      mustChangePassword: computed(() => user()?.doitChangerMotDePasse === true),
      displayName: computed(() => user()?.membreNom ?? user()?.identifiant ?? ''),
      ensureLoaded: () => Promise.resolve(user()),
    } satisfies Partial<AuthService>,
  };
}
