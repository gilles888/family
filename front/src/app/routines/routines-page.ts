import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FamilyMemberDTO, MembresService, RoutineDTO, RoutineRunDTO, RoutinesService } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { toIsoDate } from '../shared/date-utils';
import { RewardData, RewardDialog } from './reward-dialog';
import { RoutineBoard } from './routine-board';
import { currentRoutine, routinesOfDay, toggledRun } from './routine-logic';

/**
 * Écran enfant : on touche son personnage, puis on coche les étapes de sa routine du moment (matin le matin, soir
 * le soir). Le membre et la routine affichés sont dans l'URL (?membre=…&routine=…) : le bouton retour revient au choix.
 */
@Component({
  selector: 'app-routines-page',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, Avatar, RoutineBoard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routines-page.html',
  styleUrl: './routines-page.scss',
})
export class RoutinesPage {
  private readonly membresApi = inject(MembresService);
  private readonly api = inject(RoutinesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);

  protected readonly params = toSignal(this.route.queryParamMap.pipe(map((p) => ({ membre: Number(p.get('membre')) || null, routine: Number(p.get('routine')) || null }))), {
    initialValue: { membre: null, routine: null },
  });

  /** Jour affiché : aujourd'hui, au chargement de la page. */
  protected readonly today = new Date();
  private readonly todayIso = toIsoDate(this.today);

  protected readonly members = rxResource<FamilyMemberDTO[], void>({ stream: () => this.membresApi.listMembres() });
  protected readonly member = computed(() =>
    this.members.hasValue() ? this.members.value().find((m) => m.id === this.params().membre) : undefined,
  );

  protected readonly routines = rxResource<RoutineDTO[], number | undefined>({
    params: () => this.params().membre ?? undefined,
    stream: ({ params: id }) => this.api.listRoutinesMembre(id, this.todayIso),
  });

  /** Routines proposées aujourd'hui (actives, jour de la semaine). */
  protected readonly ofDay = computed(() => (this.routines.hasValue() ? routinesOfDay(this.routines.value(), this.today) : []));

  /** Routine affichée : celle de l'URL, sinon celle du moment. */
  protected readonly selected = linkedSignal(() => {
    const routines = this.ofDay();
    return routines.find((r) => r.id === this.params().routine) ?? currentRoutine(routines, new Date());
  });

  /** Numéro de la dernière coche envoyée, par routine : une réponse lente ne défait pas un tap plus récent. */
  private readonly requests = new Map<number, number>();

  protected chooseMember(member: FamilyMemberDTO): void {
    void this.router.navigate([], { queryParams: { membre: member.id } });
  }

  protected chooseRoutine(routine: RoutineDTO): void {
    void this.router.navigate([], { queryParams: { membre: this.params().membre, routine: routine.id }, replaceUrl: true });
  }

  protected back(): void {
    void this.router.navigate([], { queryParams: {} });
  }

  protected toggle(routine: RoutineDTO, stepId: number): void {
    const request = (this.requests.get(routine.id!) ?? 0) + 1;
    this.requests.set(routine.id!, request);
    this.patch(routine.id!, (r) => ({ ...r, etat: toggledRun(r, stepId) }));
    const latest = () => this.requests.get(routine.id!) === request;
    this.api.toggleEtapeRoutine(routine.id!, this.todayIso, stepId).subscribe({
      next: (etat) => latest() && this.patch(routine.id!, (r) => ({ ...r, etat })),
      error: () => latest() && this.routines.reload(),
    });
  }

  /** Mini-jeu de récompense (plein écran) ; au retour, la routine sait que la partie du jour est jouée. */
  protected openReward(routine: RoutineDTO): void {
    const member = this.member();
    if (!member) {
      return;
    }
    this.dialog
      .open<RewardDialog, RewardData, RoutineRunDTO>(RewardDialog, {
        data: { routine, member, date: this.todayIso },
        width: '100vw',
        maxWidth: '100vw',
        height: '100dvh',
        maxHeight: '100dvh',
        panelClass: 'reward-panel',
      })
      .afterClosed()
      .subscribe((etat) => etat && this.patch(routine.id!, (r) => ({ ...r, etat })));
  }

  private patch(id: number, change: (routine: RoutineDTO) => RoutineDTO): void {
    if (this.routines.hasValue()) {
      this.routines.update((list) => list?.map((r) => (r.id === id ? change(r) : r)));
    }
  }
}
