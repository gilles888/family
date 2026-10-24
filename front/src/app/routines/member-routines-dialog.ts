import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FamilyMemberDTO } from '../api-client';
import { Avatar } from '../avatar/avatar';
import { RoutineManager } from './routine-manager';

export interface MemberRoutinesData {
  member: FamilyMemberDTO;
  /** Membres vers lesquels copier une routine. */
  members?: FamilyMemberDTO[];
}

/** Mode parent : routines d'un membre, depuis la page des membres. */
@Component({
  selector: 'app-member-routines-dialog',
  imports: [MatButtonModule, MatDialogModule, Avatar, RoutineManager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-routines-dialog.html',
  styleUrl: './member-routines-dialog.scss',
})
export class MemberRoutinesDialog {
  private readonly data = inject<MemberRoutinesData>(MAT_DIALOG_DATA);
  protected readonly member = this.data.member;
  protected readonly members = this.data.members ?? [];
}
