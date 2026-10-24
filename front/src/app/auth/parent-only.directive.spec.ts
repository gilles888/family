import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MeDTO } from '../api-client';
import { enabledDashboardCards } from '../dashboard/dashboard-cards';
import { AuthService } from './auth.service';
import { ParentOnly } from './parent-only.directive';
import { provideFakeAuth } from './testing';

@Component({
  imports: [ParentOnly],
  template: `<button>Voir</button><button *appParentOnly>Supprimer</button>`,
})
class Host {}

async function render(role: MeDTO.RoleEnum) {
  TestBed.configureTestingModule({ providers: [provideFakeAuth(role)] });
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  return fixture;
}

describe('masquage selon le rôle', () => {
  it('parent : les boutons de modification sont affichés', async () => {
    const fixture = await render('PARENT');
    expect(fixture.nativeElement.textContent).toContain('Supprimer');
  });

  it('enfant : les boutons de modification sont masqués, la lecture reste', async () => {
    const fixture = await render('ENFANT');
    expect(fixture.nativeElement.textContent).toContain('Voir');
    expect(fixture.nativeElement.textContent).not.toContain('Supprimer');
  });

  it('suit un changement d’utilisateur', async () => {
    const fixture = await render('ENFANT');
    const user = (TestBed.inject(AuthService) as unknown as { user: { set(me: MeDTO): void } }).user;

    user.set({ identifiant: 'papa', role: 'PARENT' });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Supprimer');
  });

  it('panneau mobile : pas de carte Courses pour un enfant', () => {
    expect(enabledDashboardCards(undefined, true).map((c) => c.id)).toContain('shopping');
    expect(enabledDashboardCards(undefined, false).map((c) => c.id)).not.toContain('shopping');
  });
});
