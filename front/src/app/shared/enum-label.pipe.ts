import { Pipe, PipeTransform } from '@angular/core';
import {
  FREQUENCY_LABELS,
  SLOT_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  UNIT_LABELS,
} from './labels';

type EnumKind = 'type' | 'status' | 'frequency' | 'unit' | 'slot';

const LABELS: Record<EnumKind, Record<string, string>> = {
  type: TYPE_LABELS,
  status: STATUS_LABELS,
  frequency: FREQUENCY_LABELS,
  unit: UNIT_LABELS,
  slot: SLOT_LABELS,
};

/** Libellé traduit d'une valeur d'enum du backend : `{{ entry.type | enumLabel:'type' }}`. */
@Pipe({ name: 'enumLabel' })
export class EnumLabelPipe implements PipeTransform {
  transform(value: string | undefined | null, kind: EnumKind): string {
    return value ? (LABELS[kind][value] ?? value) : '';
  }
}
