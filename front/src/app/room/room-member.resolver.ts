import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FamilyMemberDTO, MembresService } from '../api-client';
import { AuthService } from '../auth/auth.service';

/**
 * Membre de la chambre (/chambre/:memberId). Même règle que l'avatar : un parent ouvre toutes les chambres, un enfant
 * seulement la sienne ; sinon, retour à l'accueil.
 */
export const roomMemberResolver: ResolveFn<FamilyMemberDTO | RedirectCommand> = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const api = inject(MembresService);
  const home = new RedirectCommand(router.parseUrl('/'));
  const id = Number(route.paramMap.get('memberId'));
  if (!Number.isInteger(id) || id <= 0) {
    return home;
  }
  await auth.ensureLoaded();
  if (auth.isChild() && auth.user()?.membreId !== id) {
    return home;
  }
  try {
    return await firstValueFrom(api.getMembre(id));
  } catch {
    return home;
  }
};
