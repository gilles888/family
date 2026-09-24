import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { AgendaEntryDTO, FamilyMemberDTO } from '../api-client';
import { parseIsoDateTime } from '../shared/date-utils';
import { EnumLabelPipe } from '../shared/enum-label.pipe';
import { entryColor } from '../shared/entry-utils';
import { STATUS_ICONS } from '../shared/labels';

interface DayGroup {
  day: Date;
  entries: AgendaEntryDTO[];
}

/** Liste des tâches de la période affichée, de la plus récente à la plus ancienne, filtrable par personnes. */
@Component({
  selector: 'app-entry-list',
  imports: [DatePipe, MatChipsModule, MatIconModule, EnumLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entry-list.html',
  styleUrl: './entry-list.scss',
})
export class EntryList {
  readonly entries = input.required<AgendaEntryDTO[]>();
  readonly members = input<FamilyMemberDTO[]>([]);
  readonly entryClick = output<AgendaEntryDTO>();

  /** Ids des personnes sélectionnées ; vide = tout le monde. */
  protected readonly selected = signal<number[]>([]);

  protected readonly groups = computed<DayGroup[]>(() => {
    const ids = this.selected();
    const visible = this.entries()
      .filter((e) => ids.length === 0 || (e.membres ?? []).some((m) => ids.includes(m.id!)))
      .map((entry) => ({ entry, date: parseIsoDateTime(entry.dateHeure!) }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const groups: DayGroup[] = [];
    for (const { entry, date } of visible) {
      const last = groups[groups.length - 1];
      if (last && last.day.toDateString() === date.toDateString()) {
        last.entries.push(entry);
      } else {
        groups.push({ day: date, entries: [entry] });
      }
    }
    return groups;
  });

  protected readonly entryColor = entryColor;
  protected readonly statusIcons = STATUS_ICONS;

  protected onSelectionChange(ids: number[]): void {
    this.selected.set(ids);
  }
}
