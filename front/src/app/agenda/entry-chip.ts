import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AgendaEntryDTO } from '../api-client';
import { contrastColor, entryColor } from '../shared/entry-utils';
import { STATUS_ICONS } from '../shared/labels';

/** Pastille compacte d'une entrée (colorée selon le premier membre, barrée si annulée). */
@Component({
  selector: 'app-entry-chip',
  imports: [DatePipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.background-color]': 'color()',
    '[style.color]': 'textColor()',
    '[class.cancelled]': 'entry().statut === "ANNULE"',
    '[class.done]': 'entry().statut === "COMPLETE"',
  },
  template: `
    @if (entry().statut !== 'PREVU') {
      <mat-icon class="status">{{ icon() }}</mat-icon>
    }
    @if (showTime()) {
      <span class="time">{{ entry().dateHeure | date: 'shortTime' }}</span>
    }
    <span class="title">{{ entry().titre }}</span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 1px 6px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 18px;
      overflow: hidden;
      white-space: nowrap;
      cursor: pointer;
    }
    .time {
      font-weight: 500;
    }
    .title {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    :host(.cancelled) {
      opacity: 0.55;
    }
    :host(.cancelled) .title {
      text-decoration: line-through;
    }
  `,
})
export class EntryChip {
  readonly entry = input.required<AgendaEntryDTO>();
  readonly showTime = input(true);

  protected readonly color = computed(() => entryColor(this.entry()));
  protected readonly textColor = computed(() => contrastColor(this.color()));
  protected readonly icon = computed(() => STATUS_ICONS[this.entry().statut ?? 'PREVU']);
}
