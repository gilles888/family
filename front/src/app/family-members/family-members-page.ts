import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FamilyMemberDTO, MembresService } from '../api-client';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { NotificationService } from '../shared/notification.service';
import { Avatar } from '../avatar/avatar';
import { AvatarEditor, AvatarEditorData } from '../avatar/avatar-editor';
import { MemberRoutinesData, MemberRoutinesDialog } from '../routines/member-routines-dialog';
import { MemberDialog, MemberDialogData } from './member-dialog';

/** Gestion des membres de la famille (liste, ajout, modification, suppression) et de leur personnage. */
@Component({
  selector: 'app-family-members-page',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './family-members-page.html',
  styleUrl: './family-members-page.scss',
})
export class FamilyMembersPage {
  private readonly api = inject(MembresService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  protected readonly members = rxResource<FamilyMemberDTO[], void>({ stream: () => this.api.listMembres() });

  protected edit(member?: FamilyMemberDTO): void {
    this.dialog
      .open<MemberDialog, MemberDialogData, boolean>(MemberDialog, { data: { member }, width: '420px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((saved) => saved && this.members.reload());
  }

  /** Éditeur de personnage : plein écran sur téléphone, grand dialogue ailleurs. */
  protected editAvatar(member: FamilyMemberDTO): void {
    this.dialog
      .open<AvatarEditor, AvatarEditorData, FamilyMemberDTO>(AvatarEditor, {
        data: { member },
        width: '960px',
        maxWidth: '100vw',
        height: '720px',
        maxHeight: '100dvh',
        panelClass: 'avatar-editor-panel',
        autoFocus: 'dialog',
      })
      .afterClosed()
      .subscribe((saved) => saved && this.members.reload());
  }

  /** Mode parent : routines du membre. */
  protected editRoutines(member: FamilyMemberDTO): void {
    this.dialog.open<MemberRoutinesDialog, MemberRoutinesData>(MemberRoutinesDialog, {
      data: { member },
      width: '640px',
      maxWidth: '100vw',
      maxHeight: '100dvh',
    });
  }

  protected remove(member: FamilyMemberDTO): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: $localize`:@@member.deleteTitle:Supprimer ce membre ?`,
          message: $localize`:@@member.deleteMessage:« ${member.nom}:name: » sera retiré de tous ses rappels. Les rappels et leurs occurrences sont conservés.`,
          confirmLabel: $localize`:@@common.delete:Supprimer`,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.api.deleteMembre(member.id!).subscribe({
            next: () => this.notifications.success($localize`:@@member.deleted:Membre supprimé.`),
            // Erreur déjà affichée par l'intercepteur ; dans tous les cas on rafraîchit la liste
            error: () => this.members.reload(),
            complete: () => this.members.reload(),
          });
        }
      });
  }
}
