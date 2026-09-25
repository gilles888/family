import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { AgendaEntryDTO, AgendaService } from '../api-client';
import { EnumLabelPipe } from '../shared/enum-label.pipe';
import { Avatar } from '../avatar/avatar';
import { NotificationService } from '../shared/notification.service';
import { contrastColor, entryColor } from '../shared/entry-utils';
import { ENTRY_STATUSES, EntryStatus, STATUS_ICONS } from '../shared/labels';

export interface EntryDialogData {
  entry: AgendaEntryDTO;
}

/** Ce que la boîte de dialogue demande à la page de faire une fois fermée. */
export type EntryDialogResult = 'saved' | 'edit-reminder' | 'delete-reminder';

/** Détail d'une occurrence + changement de son statut (PATCH /v1/agenda/entries/{id}). */
@Component({
  selector: 'app-entry-dialog',
  imports: [DatePipe, FormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatIconModule, EnumLabelPipe, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entry-dialog.html',
  styleUrl: './entry-dialog.scss',
})
export class EntryDialog {
  protected readonly entry = inject<EntryDialogData>(MAT_DIALOG_DATA).entry;
  private readonly ref = inject<MatDialogRef<EntryDialog, EntryDialogResult>>(MatDialogRef);
  private readonly agendaApi = inject(AgendaService);
  private readonly notifications = inject(NotificationService);

  protected readonly statuses = ENTRY_STATUSES;
  protected readonly statusIcons = STATUS_ICONS;
  protected readonly color = entryColor(this.entry);
  protected readonly contrastColor = contrastColor;

  protected readonly selected = signal<EntryStatus>(this.entry.statut ?? 'PREVU');
  protected readonly saving = signal(false);
  protected readonly changed = computed(() => this.selected() !== (this.entry.statut ?? 'PREVU'));

  protected save(): void {
    this.saving.set(true);
    this.agendaApi.updateEntryStatus(this.entry.id!, { statut: this.selected() }).subscribe({
      next: () => {
        this.notifications.success($localize`:@@entry.saved:Statut mis à jour.`);
        this.ref.close('saved');
      },
      error: () => this.saving.set(false), // le message d'erreur est affiché par l'intercepteur
    });
  }

  protected close(action: EntryDialogResult): void {
    this.ref.close(action);
  }
}
