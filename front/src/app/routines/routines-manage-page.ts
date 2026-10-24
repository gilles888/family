import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FamilyMemberDTO, MembresService } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { RoutineManager } from './routine-manager';

/** Mode parent : gérer les routines de chaque membre (le membre choisi est dans l'URL : ?membre=…). */
@Component({
  selector: 'app-routines-manage-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, Avatar, RoutineManager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routines-manage-page.html',
  styleUrl: './routines-manage-page.scss',
})
export class RoutinesManagePage {
  private readonly api = inject(MembresService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly memberId = toSignal(this.route.queryParamMap.pipe(map((p) => Number(p.get('membre')) || null)), { initialValue: null });

  protected readonly members = rxResource<FamilyMemberDTO[], void>({ stream: () => this.api.listMembres() });
  /** Membre choisi : celui de l'URL, sinon le premier. */
  protected readonly member = computed(() => {
    const members = this.members.value() ?? [];
    return members.find((m) => m.id === this.memberId()) ?? members[0];
  });

  protected choose(member: FamilyMemberDTO): void {
    void this.router.navigate([], { queryParams: { membre: member.id }, replaceUrl: true });
  }
}
