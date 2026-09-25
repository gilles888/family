import { ChangeDetectionStrategy, Component, LOCALE_ID, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
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
import { ROUTINE_TYPE_LABELS, hhmm, toRoutineRequest } from './routine-labels';

export interface MemberRoutinesData {
  member: FamilyMemberDTO;
}

/**
 * Mode parent : routines d'un membre. Créer, copier un modèle (dans la langue de l'application), modifier,
 * activer / désactiver, supprimer.
 */
@Component({
  selector: 'app-member-routines-dialog',
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule, MatMenuModule, MatProgressBarModule, MatSlideToggleModule, Avatar, RoutineHistory, RoutineIllustration],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-routines-dialog.html',
  styleUrl: './member-routines-dialog.scss',
})
export class MemberRoutinesDialog {
  private readonly api = inject(RoutinesService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  /** Langue des modèles : celle du build (fr ou nl). */
  private readonly language = inject(LOCALE_ID).substring(0, 2) === 'nl' ? 'nl' : 'fr';
  protected readonly member = inject<MemberRoutinesData>(MAT_DIALOG_DATA).member;

  protected readonly typeLabels = ROUTINE_TYPE_LABELS;
  protected readonly hhmm = hhmm;
  protected readonly weekDays = WEEK_DAYS.map((code) => ({ code, reference: WEEKDAY_REFERENCE_DATES[code] }));

  protected readonly routines = rxResource<RoutineDTO[], void>({ stream: () => this.api.listRoutinesMembre(this.member.id!) });
  protected readonly templates = rxResource<RoutineTemplateDTO[], void>({ stream: () => this.api.listModelesRoutine(this.language) });

  protected create(): void {
    this.openEditor({ member: this.member });
  }

  protected edit(routine: RoutineDTO): void {
    this.openEditor({ member: this.member, routine });
  }

  protected fromTemplate(template: RoutineTemplateDTO): void {
    this.api.appliquerModeleRoutine(this.member.id!, { modele: template.id!, langue: this.language }).subscribe((routine) => {
      this.notifications.success($localize`:@@memberRoutines.added:« ${routine.nom}:name: » ajoutée : vous pouvez l'adapter.`);
      this.routines.reload();
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
