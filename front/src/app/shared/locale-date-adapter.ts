import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * NativeDateAdapter analyse la saisie avec `Date.parse`, qui lit "25/09/2026" comme mois/jour (américain) :
 * la saisie manuelle jj/mm/aaaa (fr, nl) serait rejetée. Cet adaptateur lit la saisie dans l'ordre jour/mois/année
 * propre à la locale active (déduit d'Intl) et accepte aussi le format ISO (aaaa-mm-jj).
 */
@Injectable()
export class LocaleDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, _parseFormat?: unknown): Date | null {
    if (typeof value !== 'string') {
      return super.parse(value, _parseFormat);
    }
    const text = value.trim();
    if (!text) {
      return null;
    }
    const parts = text.split(/[\s./-]+/).filter(Boolean);
    if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d{1,4}$/.test(p))) {
      return this.invalid();
    }
    const numbers = parts.map(Number);

    let day: number, month: number, year: number;
    if (parts[0].length === 4) {
      [year, month, day] = numbers; // ISO : aaaa-mm-jj
    } else {
      const order = this.dateOrder();
      const [first, second, third] = numbers;
      [day, month] = order.indexOf('day') < order.indexOf('month') ? [first, second] : [second, first];
      year = third ?? new Date().getFullYear();
      if (parts[2] !== undefined && parts[2].length <= 2) {
        year += 2000; // 25/09/26 -> 2026
      }
    }
    // `new Date` fait déborder les valeurs hors bornes (31/02 -> 03/03) : on les refuse
    const date = new Date(year, month - 1, day);
    return date.getMonth() === month - 1 && date.getDate() === day ? date : this.invalid();
  }

  /** Ordre des composantes d'une date dans la locale active, ex. ['day', 'month', 'year'] en fr / nl. */
  private dateOrder(): string[] {
    return new Intl.DateTimeFormat(this.locale, { day: 'numeric', month: 'numeric', year: 'numeric' })
      .formatToParts(new Date(2000, 10, 25))
      .map((p) => p.type)
      .filter((t) => t === 'day' || t === 'month' || t === 'year');
  }
}
