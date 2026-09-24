import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AgendaEntryDTO } from '../api-client';
import { EnumLabelPipe } from '../shared/enum-label.pipe';
import { contrastColor, entryColor } from '../shared/entry-utils';
import { STATUS_ICONS } from '../shared/labels';
import { mealOf } from '../meals/meal-entries';

/** Vue Jour : liste détaillée des entrées d'une journée. */
@Component({
  selector: 'app-day-view',
  imports: [DatePipe, MatIconModule, EnumLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './day-view.html',
  styleUrl: './day-view.scss',
})
export class DayView {
  readonly entries = input.required<AgendaEntryDTO[]>();
  readonly entryClick = output<AgendaEntryDTO>();

  protected readonly entryColor = entryColor;
  protected readonly contrastColor = contrastColor;
  protected readonly statusIcons = STATUS_ICONS;
  protected readonly mealOf = mealOf;
}
