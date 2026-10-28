import { SeasonId } from '../theme/seasons';
import { AvatarConfig } from './avatar-config';
import { ARTICLE_FIELDS, findArticle } from './article-info';
import { NONE } from './avatar-parts';

/** Une idée de tenue complète : les pièces à poser (le reste du personnage ne change pas). */
export type OutfitIdea = Partial<Pick<AvatarConfig, 'costume' | 'outfit' | 'hat' | 'accessory' | 'back' | 'face' | 'held' | 'background'>>;

/** Trois tenues toutes prêtes par thème (Saint-Nicolas reprend celles de Noël). */
const NOEL: OutfitIdea[] = [
  { costume: 'costume-santa', held: 'held-gift' },
  { costume: 'costume-elf', held: 'held-candycane', face: 'face-reindeer' },
  { outfit: 'outfit-xmas-sweater', hat: 'hat-antlers', held: 'held-speculoos', face: 'face-reindeer' },
];

export const OUTFIT_IDEAS: Partial<Record<SeasonId, OutfitIdea[]>> = {
  halloween: [
    { costume: 'costume-witch', held: 'held-broom', face: 'face-cat' },
    { costume: 'costume-pumpkin', held: 'held-lantern', face: 'face-pumpkin' },
    { costume: 'costume-vampire', back: 'back-bat-wings', held: 'held-candy-bucket' },
  ],
  'saint-nicolas': NOEL,
  noel: NOEL,
  carnaval: [
    { costume: 'costume-clown', face: 'face-clown-nose', held: 'held-streamers' },
    { costume: 'costume-hero', back: 'back-hero-cape', held: 'held-foam-sword' },
    { costume: 'costume-princess', back: 'back-fairy-wings', held: 'held-wand' },
  ],
  paques: [
    { costume: 'costume-bunny', held: 'held-egg-basket' },
    { hat: 'hat-flower-crown', back: 'back-butterfly-wings', face: 'face-butterfly' },
    { hat: 'hat-bunny-ears', held: 'held-watering-can', face: 'face-butterfly' },
  ],
  printemps: [
    { hat: 'hat-flower-crown', held: 'held-watering-can', face: 'face-butterfly' },
    { hat: 'hat-flower-crown', back: 'back-butterfly-wings', held: 'held-flower' },
    { outfit: 'outfit-raincoat', held: 'held-umbrella' },
  ],
  ete: [
    { outfit: 'outfit-swimsuit', hat: 'hat-straw', held: 'held-icecream' },
    { outfit: 'outfit-hawaii', hat: 'hat-beach', accessory: 'acc-diving-mask', held: 'held-bucket-spade' },
    { outfit: 'outfit-swimsuit', hat: 'hat-beach', held: 'held-float', background: 'bg-beach' },
  ],
  rentree: [
    { back: 'back-backpack', hat: 'hat-school-cap', held: 'held-book' },
    { back: 'back-backpack', outfit: 'outfit-sweater', held: 'held-big-pencil' },
    { costume: 'costume-doctor', back: 'back-backpack', held: 'held-book' },
  ],
  automne: [
    { outfit: 'outfit-raincoat', hat: 'hat-bob', held: 'held-umbrella' },
    { outfit: 'outfit-raincoat', accessory: 'acc-scarf', held: 'held-maple-leaf' },
    { outfit: 'outfit-sweater', hat: 'hat-beanie', held: 'held-maple-leaf' },
  ],
  hiver: [
    { outfit: 'outfit-puffer', hat: 'hat-pompom', accessory: 'acc-long-scarf', held: 'held-hot-chocolate' },
    { outfit: 'outfit-puffer', hat: 'hat-earmuffs', accessory: 'acc-long-scarf', background: 'bg-snow' },
    { costume: 'costume-snowman', held: 'held-hot-chocolate' },
  ],
  anniversaire: [
    { hat: 'hat-party', held: 'held-balloon' },
    { hat: 'hat-cake-crown', held: 'held-cake' },
    { hat: 'hat-party', held: 'held-cake', background: 'bg-sunset' },
  ],
};

/** Le personnage actuel, habillé de l'idée (déguisement, dos, visage, objet, chapeau et accessoire repartent de zéro). */
export function applyIdea(config: AvatarConfig, idea: OutfitIdea): AvatarConfig {
  return { ...config, costume: NONE, back: NONE, face: NONE, held: NONE, hat: NONE, accessory: NONE, ...idea };
}

/** Articles de l'idée (hors gratuits et couleurs) : ils servent à calculer ce qu'il manque. */
export function ideaArticles(idea: OutfitIdea): string[] {
  return ARTICLE_FIELDS.map((field) => (idea as Record<string, string | undefined>)[field]).filter((id): id is string => !!id && !!findArticle(id));
}

/** Nom d'une idée : celui de sa pièce principale (déguisement, sinon chapeau, objet…). */
export function ideaTitle(idea: OutfitIdea): string {
  const main = idea.costume ?? idea.hat ?? idea.held ?? idea.outfit ?? idea.back ?? idea.face;
  return (main && findArticle(main)?.label) || '';
}
