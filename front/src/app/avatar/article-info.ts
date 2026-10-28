import { BACKGROUND_GRADIENTS, PARTS_BY_SLOT, PartMeta } from './avatar-parts';

/** Ce que le front sait d'un article du catalogue : nom, emplacement, thème, rareté (le prix vient du serveur). */
export interface ArticleInfo extends PartMeta {
  id: string;
  label: string;
  /** Emplacement = champ de la config du personnage. */
  emplacement: string;
}

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

let index: Map<string, ArticleInfo> | undefined;

function build(): Map<string, ArticleInfo> {
  const map = new Map<string, ArticleInfo>();
  for (const [slot, emplacement] of Object.entries(FIELD)) {
    for (const part of PARTS_BY_SLOT[slot as keyof typeof PARTS_BY_SLOT]) {
      map.set(part.id, { id: part.id, label: part.label, emplacement, theme: part.theme, rarete: part.rarete, free: part.free });
    }
  }
  for (const g of BACKGROUND_GRADIENTS) {
    map.set(g.id, { id: g.id, label: g.label, emplacement: 'background', theme: g.theme, rarete: g.rarete, free: g.free });
  }
  return map;
}

/** Nom et métadonnées d'un article (undefined si le front ne le dessine pas). */
export function findArticle(id: string): ArticleInfo | undefined {
  index ??= build();
  return index.get(id);
}

/** Champs de la config où l'on peut porter un article du catalogue. */
export const ARTICLE_FIELDS = ['eyes', 'mouth', 'hair', 'outfit', 'hat', 'accessory', 'costume', 'face', 'back', 'held', 'background'] as const;
