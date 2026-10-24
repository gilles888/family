import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FamilyMemberDTO, RoutineDTO, RoutineTemplateDTO, RoutinesService } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { WEEKDAY_REFERENCE_DATES, WEEK_DAYS } from '../shared/labels';
import { NotificationService } from '../shared/notification.service';
import { RoutineEditorData, RoutineEditorDialog } from './routine-editor-dialog';
import { RoutineIllustration } from './routine-icon';
import { RoutineHistory } from './routine-history';
import { ROUTINE_TYPE_LABELS, copyRequest, hhmm, toRoutineRequest } from './routine-labels';

/**
 * Mode parent : routines d'un membre. Créer, copier un modèle (dans la langue de l'application), modifier, copier
 * vers un membre, activer / désactiver, supprimer. Utilisé par la page « Gérer les routines » et le dialogue des membres.
 */
@Component({
  selector: 'app-routine-manager',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatMenuModule, MatProgressBarModule, MatSlideToggleModule, Avatar, RoutineHistory, RoutineIllustration],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-manager.html',
  styleUrl: './routine-manager.scss',
})
export class RoutineManager {
  private readonly api = inject(RoutinesService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  /** Langue des modèles : celle du build (fr ou nl). */
  private readonly language = inject(LOCALE_ID).substring(0, 2) === 'nl' ? 'nl' : 'fr';

  readonly member = input.required<FamilyMemberDTO>();
  /** Membres vers lesquels une routine peut être copiée (le membre affiché compris : duplication). */
  readonly members = input<FamilyMemberDTO[]>([]);

  protected readonly typeLabels = ROUTINE_TYPE_LABELS;
  protected readonly hhmm = hhmm;
  protected readonly weekDays = WEEK_DAYS.map((code) => ({ code, reference: WEEKDAY_REFERENCE_DATES[code] }));
  protected readonly copyTargets = computed(() => (this.members().length ? this.members() : [this.member()]));

  protected readonly routines = rxResource<RoutineDTO[], number>({
    params: () => this.member().id!,
    stream: ({ params: id }) => this.api.listRoutinesMembre(id),
  });
  protected readonly templates = rxResource<RoutineTemplateDTO[], void>({ stream: () => this.api.listModelesRoutine(this.language) });

  protected create(): void {
    this.openEditor({ member: this.member() });
  }

  protected edit(routine: RoutineDTO): void {
    this.openEditor({ member: this.member(), routine });
  }

  protected fromTemplate(template: RoutineTemplateDTO): void {
    this.api.appliquerModeleRoutine(this.member().id!, { modele: template.id!, langue: this.language }).subscribe((routine) => {
      this.notifications.success($localize`:@@memberRoutines.added:« ${routine.nom}:name: » ajoutée : vous pouvez l'adapter.`);
      this.routines.reload();
    });
  }

  /** Copie indépendante (étapes comprises) chez le membre choisi ; chez le même membre, nom suffixé « (copie) ». */
  protected copyTo(routine: RoutineDTO, target: FamilyMemberDTO): void {
    const same = target.id === this.member().id;
    const nom = same ? $localize`:@@routineManager.copyName:${routine.nom}:name: (copie)` : routine.nom!;
    this.api.createRoutine(copyRequest(routine, target.id!, nom.substring(0, 100))).subscribe((copy) => {
      this.notifications.success(
        same
          ? $localize`:@@routineManager.duplicated:« ${copy.nom}:name: » créée.`
          : $localize`:@@routineManager.copied:« ${copy.nom}:name: » copiée pour ${target.nom}:member:.`,
      );
      if (same) {
        this.routines.reload();
      }
    });
  }

  protected setActive(routine: RoutineDTO, active: boolean): void {
    this.api.updateRoutine(routine.id!, toRoutineRequest(routine, { active })).subscribe({
      next: () => this.routines.reload(),
      error: () => this.routines.reload(),
    });
  }

  protected remove(routine: RoutineDTO): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: $localize`:@@memberRoutines.deleteTitle:Supprimer la routine ?`,
          message: $localize`:@@memberRoutines.deleteMessage:« ${routine.nom}:name: » et son historique seront supprimés.`,
          confirmLabel: $localize`:@@common.delete:Supprimer`,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => confirmed && this.api.deleteRoutine(routine.id!).subscribe({ complete: () => this.routines.reload(), error: () => this.routines.reload() }));
  }

  private openEditor(data: RoutineEditorData): void {
    this.dialog
      .open<RoutineEditorDialog, RoutineEditorData, RoutineDTO>(RoutineEditorDialog, {
        data,
        width: '760px',
        maxWidth: '100vw',
        maxHeight: '100dvh',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((saved) => saved && this.routines.reload());
  }
}
