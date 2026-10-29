import { AvatarDressingStore } from '../avatar/avatar-dressing-store';
import { WARDROBE, WardrobeCategory, WardrobeGroup } from '../avatar/avatar-wardrobe';
import { FurnitureId } from './room-model';

/** Meubles qui rangent des affaires de la garde-robe (la tirelire et la boutique ont leur propre contenu). */
export type StorageFurniture = Exclude<FurnitureId, 'tirelire' | 'boutique' | 'livre'>;

/** Quelles catégories (et quels groupes) de la garde-robe vont dans quel meuble. */
const CONTENT: Record<StorageFurniture, { category: WardrobeCategory['id']; groups?: string[] }[]> = {
  armoire: [{ category: 'costume' }, { category: 'outfit' }],
  commode: [{ category: 'accessory' }, { category: 'back' }, { category: 'face', groups: ['makeup'] }],
  chapeaux: [{ category: 'hat' }],
  coiffeuse: [{ category: 'hair' }, { category: 'face', groups: ['skin', 'eyes', 'eyeColor', 'mouth'] }],
  coffre: [{ category: 'held' }],
  fenetre: [{ category: 'background' }],
};

const category = (id: WardrobeCategory['id']) => WARDROBE.find((c) => c.id === id)!;

/** Groupes de vignettes d'un meuble, selon le filtre du store (ou « à moi » / « boutique » forcés). */
export function furnitureGroups(store: AvatarDressingStore, id: FurnitureId): WardrobeGroup[] {
  if (id === 'tirelire' || id === 'livre') {
    return [];
  }
  if (id === 'boutique') {
    // tout ce qui s'achète et n'est pas encore possédé, rangé par catégorie
    return WARDROBE.flatMap((c) => store.groupsOf(c, 'shop')).map((g) => ({ ...g, options: g.options.filter((o) => !o.none) })).filter((g) => g.options.length > 0);
  }
  return CONTENT[id].flatMap(({ category: cat, groups }) =>
    store.groupsOf(category(cat)).filter((g) => !groups || groups.includes(g.id)),
  );
}

/** Nombre de pièces rangées dans le meuble (hors « aucun ») : 0 = meuble vide, grisé. */
export function furnitureCount(store: AvatarDressingStore, id: FurnitureId): number {
  if (id === 'tirelire') {
    return 1;
  }
  if (id === 'livre') {
    return store.ideas().length;
  }
  return furnitureGroups(store, id).reduce((n, g) => n + g.options.filter((o) => !o.none).length, 0);
}
