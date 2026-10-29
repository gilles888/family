import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BACKGROUND_GRADIENTS, PARTS_BY_SLOT } from './avatar-parts';

/**
 * Cohérence entre les dessins (front) et le catalogue des prix (backend, source de vérité des prix).
 *
 * Choix : le catalogue est un seul fichier JSON du backend, lu directement ici. Pas de génération (rien à relancer ni à
 * oublier de committer), pas de duplication des prix côté front, et le test tourne dans `npm test`, donc aussi dans la
 * CI GitHub Actions (qui récupère tout le dépôt). Il échoue dans les deux sens : un article sans dessin, ou une pièce
 * dessinée mais absente du catalogue ou à un prix qui contredit son drapeau « gratuite ».
 */
interface Article {
  id: string;
  emplacement: string;
  rarete: string;
  prix?: number;
  theme?: string;
}

const CATALOGUE = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../backend/src/main/resources/boutique/catalogue.json'),
    'utf8',
  ),
) as {
  bareme: Record<string, number>;
  articles: Article[];
};

const FIELD: Record<string, string> = {
  eyes: 'eyes',
  mouth: 'mouth',
  hair: 'hair',
  body: 'outfit',
  hat: 'hat',
  accessory: 'accessory',
  costume: 'costume',
  face: 'face',
  back: 'back',
  held: 'held',
};

interface Drawn {
  id: string;
  emplacement: string;
  free?: boolean;
  rarete?: string;
  theme?: string;
}

const drawn: Drawn[] = [
  ...Object.entries(FIELD).flatMap(([slot, emplacement]) =>
    PARTS_BY_SLOT[slot as keyof typeof PARTS_BY_SLOT]
      .filter((p) => p.id !== 'none')
      .map((p) => ({ ...p, emplacement })),
  ),
  ...BACKGROUND_GRADIENTS.map((g) => ({ ...g, emplacement: 'background' })),
];

describe('catalogue de la boutique', () => {
  const byId = new Map(CATALOGUE.articles.map((a) => [a.id, a]));

  it('aucun id en double', () => {
    expect(byId.size).toBe(CATALOGUE.articles.length);
  });

  it('chaque article du catalogue a un dessin, dans le même emplacement', () => {
    const dessins = new Map(drawn.map((d) => [d.id, d]));
    const sansDessin = CATALOGUE.articles
      .filter((a) => dessins.get(a.id)?.emplacement !== a.emplacement)
      .map((a) => a.id);
    expect(sansDessin).toEqual([]);
  });

  it('chaque pièce dessinée est au catalogue ; gratuite = prix 0, payante = prix > 0', () => {
    const absentes = drawn.filter((d) => !byId.has(d.id)).map((d) => d.id);
    expect(absentes).toEqual([]);
    const incoherentes = drawn
      .filter((d) => {
        const a = byId.get(d.id)!;
        const prix = a.prix ?? CATALOGUE.bareme[a.rarete];
        return d.free ? prix !== 0 : !(prix > 0);
      })
      .map((d) => d.id);
    expect(incoherentes).toEqual([]);
  });

  it('rareté et thème identiques des deux côtés', () => {
    const differents = drawn
      .filter((d) => !d.free)
      .filter((d) => {
        const a = byId.get(d.id)!;
        return (
          a.rarete !== (d.rarete ?? 'commun') ||
          (a.theme ?? null) !== (d.theme ? d.theme.toUpperCase().replace('-', '_') : null)
        );
      })
      .map((d) => d.id);
    expect(differents).toEqual([]);
  });

  it('le barème couvre toutes les raretés', () => {
    for (const a of CATALOGUE.articles) {
      expect(a.prix ?? CATALOGUE.bareme[a.rarete]).toBeGreaterThanOrEqual(0);
    }
  });
});
