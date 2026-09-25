import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RoutineDTO } from '../api-client';
import { RoutineBoard } from './routine-board';

const ROUTINE: RoutineDTO = {
  id: 1,
  nom: 'Mijn ochtendroutine',
  sousTitre: 'Een goede start van de dag!',
  type: 'MORNING',
  theme: 'DAY',
  jours: ['MONDAY'],
  active: true,
  etapes: [
    { id: 10, position: 0, libelle: 'Ik sta op.', icone: 'wake-up', couleur: '#FDE2E4' },
    { id: 11, position: 1, libelle: 'Ik poets mijn tanden.', icone: 'toothbrush', couleur: '#E2F0CB' },
    { id: 12, position: 2, libelle: 'Ik ben klaar!', icone: 'finish', couleur: '#FFF1C1' },
  ],
  etat: { date: '2026-09-25', etapesCochees: [11], terminee: false, recompenseJouee: false },
};

describe('RoutineBoard', () => {
  let ref: ComponentRef<RoutineBoard>;
  let el: HTMLElement;

  function render(routine: RoutineDTO): void {
    ref = TestBed.createComponent(RoutineBoard).componentRef;
    ref.setInput('routine', routine);
    ref.setInput('member', { id: 4, nom: 'Tom', couleur: '#4CAF50' });
    ref.changeDetectorRef.detectChanges();
    el = ref.location.nativeElement;
  }

  const rows = () => [...el.querySelectorAll<HTMLElement>('[role="checkbox"]')];

  it('affiche le titre, le sous-titre et les étapes numérotées, dans l’ordre', () => {
    render(ROUTINE);

    expect(el.querySelector('.title')?.textContent).toContain('Mijn ochtendroutine');
    expect(el.querySelector('.subtitle')?.textContent).toContain('Een goede start van de dag!');
    expect(rows().map((r) => r.querySelector('.label')?.textContent?.trim())).toEqual([
      'Ik sta op.',
      'Ik poets mijn tanden.',
      'Ik ben klaar!',
    ]);
    expect(rows().map((r) => r.querySelector('.number')?.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(rows()[1].style.getPropertyValue('--row')).toBe('#E2F0CB');
  });

  it('montre les étapes cochées et la progression', () => {
    render(ROUTINE);

    expect(rows().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(el.querySelector('.count')?.textContent?.replace(/\s/g, '')).toBe('1/3');
  });

  it('étapes « avec personnage » : l’avatar du membre à côté de l’illustration', () => {
    render(ROUTINE);

    expect(rows()[0].querySelector('app-avatar')).not.toBeNull();
    expect(rows()[0].querySelector('[data-icon="wake-up"]')).not.toBeNull();
  });

  it('thème nuit', () => {
    render({ ...ROUTINE, theme: 'NIGHT' });

    expect(el.classList).toContain('night');
  });

  it('toucher une ligne émet la demande de coche', () => {
    render(ROUTINE);
    const toggled: number[] = [];
    ref.instance.toggle.subscribe((id) => toggled.push(id));

    rows()[2].click();

    expect(toggled).toEqual([12]);
  });
});
