import { FamilyMemberDTO } from '../api-client';
import { SchoolCalendar } from './school-calendar';
import { anniversaireEn, paques, prochainAnniversaire, seasonFor } from './seasons';

/** Calendrier de test : 1er juillet au 31 août, rentrée le 1er septembre. */
const CAL: SchoolCalendar = {
  vacances: (a) => ({ debut: new Date(a, 6, 1), fin: new Date(a, 7, 31), rentree: new Date(a, 8, 1) }),
};

const jour = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const membre = (nom: string, dateNaissance?: string): FamilyMemberDTO => ({ id: nom.length, nom, couleur: '#e91e63', dateNaissance });
const sans: FamilyMemberDTO[] = [];

describe('paques', () => {
  it.each([
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
  ])('en %i', (annee, attendu) => {
    expect(paques(annee)).toEqual(jour(attendu));
  });
});

describe('seasonFor — événements', () => {
  it('10 oct : Halloween en approche, 21 jours avant', () => {
    expect(seasonFor(jour('2026-10-10'), sans, CAL)).toEqual({ id: 'halloween', phase: 'approche', joursRestants: 21 });
  });
  it('9 oct : pas encore', () => {
    expect(seasonFor(jour('2026-10-09'), sans, CAL)).toEqual({ id: 'automne', phase: null });
  });
  it('27 oct (J−4) : encore en approche, 28 oct (J−3) : jour J', () => {
    expect(seasonFor(jour('2026-10-27'), sans, CAL).phase).toBe('approche');
    expect(seasonFor(jour('2026-10-28'), sans, CAL).phase).toBe('jourJ');
  });
  it('29 oct : Halloween, jour J', () => {
    expect(seasonFor(jour('2026-10-29'), sans, CAL)).toMatchObject({ id: 'halloween', phase: 'jourJ', joursRestants: 2 });
  });
  it('1er nov : encore Halloween, sans jours restants', () => {
    expect(seasonFor(jour('2026-11-01'), sans, CAL)).toEqual({ id: 'halloween', phase: 'jourJ' });
  });
  it('2 nov : automne', () => {
    expect(seasonFor(jour('2026-11-02'), sans, CAL)).toEqual({ id: 'automne', phase: null });
  });
  it('20 nov : Saint-Nicolas en approche', () => {
    expect(seasonFor(jour('2026-11-20'), sans, CAL)).toMatchObject({ id: 'saint-nicolas', phase: 'approche' });
  });
  it('5 déc : Saint-Nicolas gagne sur Noël', () => {
    expect(seasonFor(jour('2026-12-05'), sans, CAL)).toMatchObject({ id: 'saint-nicolas', phase: 'jourJ' });
  });
  it('6 déc : Saint-Nicolas, 7 déc : Noël', () => {
    expect(seasonFor(jour('2026-12-06'), sans, CAL).id).toBe('saint-nicolas');
    expect(seasonFor(jour('2026-12-07'), sans, CAL)).toMatchObject({ id: 'noel', phase: 'approche', joursRestants: 18 });
  });
  it('3 janv : Noël, fenêtre à cheval sur deux années', () => {
    expect(seasonFor(jour('2027-01-03'), sans, CAL)).toMatchObject({ id: 'noel', phase: 'jourJ' });
    expect(seasonFor(jour('2027-01-06'), sans, CAL).id).toBe('noel');
    expect(seasonFor(jour('2027-01-07'), sans, CAL).id).toBe('hiver');
  });
  it('10 janv : hiver', () => {
    expect(seasonFor(jour('2027-01-10'), sans, CAL)).toEqual({ id: 'hiver', phase: null });
  });
  it('carnaval : Mardi gras 2026 = 17 février', () => {
    expect(seasonFor(jour('2026-02-17'), sans, CAL)).toMatchObject({ id: 'carnaval', phase: 'jourJ', joursRestants: 0 });
    expect(seasonFor(jour('2026-02-18'), sans, CAL).id).toBe('hiver');
  });
  it('Pâques 2026 : en approche dès le 15 mars, encore le lundi', () => {
    expect(seasonFor(jour('2026-03-15'), sans, CAL)).toMatchObject({ id: 'paques', phase: 'approche' });
    expect(seasonFor(jour('2026-04-06'), sans, CAL).id).toBe('paques');
    expect(seasonFor(jour('2026-04-07'), sans, CAL)).toEqual({ id: 'printemps', phase: null });
  });
  it('20 juin : été en approche (vacances le 1er juillet)', () => {
    expect(seasonFor(jour('2026-06-20'), sans, CAL)).toMatchObject({ id: 'ete', phase: 'approche', joursRestants: 11 });
  });
  it('1er juin : été de fond, couleurs seulement', () => {
    expect(seasonFor(jour('2026-06-01'), sans, CAL)).toEqual({ id: 'ete', phase: null });
  });
  it('pendant les vacances : été, jour J ; jusqu’à la fin des vacances', () => {
    expect(seasonFor(jour('2026-07-15'), sans, CAL)).toMatchObject({ id: 'ete', phase: 'jourJ' });
    expect(seasonFor(jour('2026-08-14'), sans, CAL).id).toBe('ete');
  });
  it('rentrée −14 j : la rentrée gagne sur l’été ; le jour de la rentrée, jour J', () => {
    expect(seasonFor(jour('2026-08-18'), sans, CAL)).toMatchObject({ id: 'rentree', phase: 'approche', joursRestants: 14 });
    expect(seasonFor(jour('2026-09-01'), sans, CAL)).toMatchObject({ id: 'rentree', phase: 'jourJ', joursRestants: 0 });
    expect(seasonFor(jour('2026-09-11'), sans, CAL).id).toBe('rentree');
    expect(seasonFor(jour('2026-09-12'), sans, CAL).id).toBe('automne');
  });
  it('1er mars : printemps', () => {
    expect(seasonFor(jour('2026-03-01'), sans, CAL).id).toBe('printemps');
  });
});

describe('seasonFor — anniversaires', () => {
  const bruno = membre('Bruno', '2018-05-14');

  it('J−8 : rien ; J−7 et J−1 : en approche ; J : jour J ; J+1 : fini', () => {
    expect(seasonFor(jour('2026-05-06'), [bruno], CAL).id).toBe('printemps');
    expect(seasonFor(jour('2026-05-07'), [bruno], CAL)).toMatchObject({ id: 'anniversaire', phase: 'approche', joursRestants: 7 });
    expect(seasonFor(jour('2026-05-13'), [bruno], CAL)).toMatchObject({ id: 'anniversaire', phase: 'approche', joursRestants: 1 });
    expect(seasonFor(jour('2026-05-14'), [bruno], CAL)).toMatchObject({ id: 'anniversaire', phase: 'jourJ', joursRestants: 0 });
    expect(seasonFor(jour('2026-05-14'), [bruno], CAL).membres).toEqual([bruno]);
    expect(seasonFor(jour('2026-05-15'), [bruno], CAL).id).toBe('printemps');
  });
  it('3 jours avant un anniversaire, en pleine approche d’Halloween : l’anniversaire gagne', () => {
    const m = membre('Alice', '2017-10-26');
    expect(seasonFor(jour('2026-10-23'), [m], CAL)).toMatchObject({ id: 'anniversaire', phase: 'approche' });
    expect(seasonFor(jour('2026-10-23'), sans, CAL).id).toBe('halloween');
  });
  it('anniversaire le 31 octobre : le jour même l’emporte, sur Halloween', () => {
    expect(seasonFor(jour('2026-10-31'), [membre('Jules', '2015-10-31')], CAL).id).toBe('anniversaire');
  });
  it('anniversaire le 31 octobre : les jours d’avant, il passe avant Halloween (même date clé)', () => {
    expect(seasonFor(jour('2026-10-28'), [membre('Jules', '2015-10-31')], CAL)).toMatchObject({ id: 'anniversaire', phase: 'approche' });
  });
  it('Halloween plus proche que l’anniversaire : Halloween gagne', () => {
    const m = membre('Alice', '2017-11-03');
    expect(seasonFor(jour('2026-10-29'), [m], CAL).id).toBe('halloween');
  });
  it('anniversaire le 2 janvier, vu depuis décembre (année suivante)', () => {
    const m = membre('Lou', '2016-01-02');
    expect(seasonFor(jour('2026-12-30'), [m], CAL)).toMatchObject({ id: 'anniversaire', joursRestants: 3 });
    expect(seasonFor(jour('2027-01-02'), [m], CAL)).toMatchObject({ id: 'anniversaire', phase: 'jourJ' });
  });
  it('deux anniversaires le même jour : les deux membres', () => {
    const a = membre('Alice', '2017-05-20');
    const b = membre('Bruno', '2019-05-20');
    expect(seasonFor(jour('2026-05-20'), [a, b], CAL).membres).toEqual([a, b]);
  });
  it('deux anniversaires proches : le plus proche', () => {
    const a = membre('Alice', '2017-05-20');
    const b = membre('Bruno', '2019-05-23');
    expect(seasonFor(jour('2026-05-18'), [a, b], CAL).membres).toEqual([a]);
  });
  it('né un 29 février : fêté le 28 février les années non bissextiles, le 29 sinon', () => {
    const m = membre('Léo', '2016-02-29');
    expect(anniversaireEn('2016-02-29', 2026)).toEqual(jour('2026-02-28'));
    expect(anniversaireEn('2016-02-29', 2032)).toEqual(jour('2032-02-29'));
    expect(seasonFor(jour('2026-02-28'), [m], CAL)).toMatchObject({ id: 'anniversaire', phase: 'jourJ' });
    expect(seasonFor(jour('2032-02-28'), [m], CAL)).toMatchObject({ id: 'anniversaire', phase: 'approche', joursRestants: 1 });
  });
  it('membre sans date de naissance : ignoré', () => {
    expect(seasonFor(jour('2026-05-14'), [membre('Papa')], CAL)).toEqual({ id: 'printemps', phase: null });
  });
  it('anniversaires désactivés (liste vide) : ignorés', () => {
    expect(seasonFor(jour('2026-05-14'), [], CAL)).toEqual({ id: 'printemps', phase: null });
  });
});

describe('prochainAnniversaire', () => {
  it('le plus proche, y compris l’année suivante', () => {
    const a = membre('Alice', '2017-01-10');
    const b = membre('Bruno', '2019-12-31');
    expect(prochainAnniversaire(jour('2026-12-20'), [a, b])).toEqual({ membres: [b], jours: 11 });
    expect(prochainAnniversaire(jour('2027-01-01'), [a, b])).toEqual({ membres: [a], jours: 9 });
    expect(prochainAnniversaire(jour('2026-12-20'), [membre('Papa')])).toBeNull();
  });
});
