import { Pipe, PipeTransform } from '@angular/core';
import { FREQUENCY_LABELS, Frequency, EntryStatus, ReminderType, STATUS_LABELS, TYPE_LABELS } from './labels';

/** Libellé traduit d'une valeur d'enum du backend : `{{ entry.type | enumLabel:'type' }}`. */
@Pipe({ name: 'enumLabel' })
export class EnumLabelPipe implements PipeTransform {
  transform(value: string | undefined | null, kind: 'type' | 'status' | 'frequency'): string {
    if (!value) {
      return '';
    }
    const labels: Record<string, string> =
      kind === 'type' ? TYPE_LABELS : kind === 'status' ? STATUS_LABELS : FREQUENCY_LABELS;
    return labels[value as ReminderType | EntryStatus | Frequency] ?? value;
  }
}
