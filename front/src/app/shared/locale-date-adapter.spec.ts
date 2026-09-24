import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { LocaleDateAdapter } from './locale-date-adapter';

function adapterFor(locale: string): LocaleDateAdapter {
  TestBed.configureTestingModule({ providers: [LocaleDateAdapter, { provide: MAT_DATE_LOCALE, useValue: locale }] });
  return TestBed.inject(LocaleDateAdapter);
}

describe('LocaleDateAdapter', () => {
  it('lit les dates jour/mois/année en fr et nl', () => {
    for (const locale of ['fr', 'nl']) {
      const a = adapterFor(locale);
      const d = a.parse('25/09/2026')!;
      expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 25]);
      expect(a.parse('5-3-2027')!.getMonth()).toBe(2);
      expect(a.parse('25.09.26')!.getFullYear()).toBe(2026);
      TestBed.resetTestingModule();
    }
  });

  it('lit le mois avant le jour en en-US et accepte l\'ISO partout', () => {
    const a = adapterFor('en-US');
    expect(a.parse('9/25/2026')!.getDate()).toBe(25);
    expect(a.parse('2026-09-25')!.getMonth()).toBe(8);
  });

  it('rejette les dates impossibles ou illisibles', () => {
    const a = adapterFor('fr');
    expect(a.isValid(a.parse('31/02/2026')!)).toBe(false);
    expect(a.isValid(a.parse('abc')!)).toBe(false);
    expect(a.isValid(a.parse('32/01/2026')!)).toBe(false);
    expect(a.parse('')).toBeNull();
  });
});
