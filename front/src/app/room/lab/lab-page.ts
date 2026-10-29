import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Avatar } from '../../avatar/avatar';
import { PARTS_BY_SLOT, SKIN_TONES } from '../../avatar/avatar-parts';
import { AvatarConfig, normalizeAvatar, defaultAvatar } from '../../avatar/avatar-config';

const DEMO: AvatarConfig = normalizeAvatar(
  { version: 2, skin: 'skin-3', eyes: 'eyes-happy', eyeColor: '#5d4037', mouth: 'mouth-grin', hair: 'hair-ponytail', hairColor: '#6b3e26', outfit: 'outfit-tshirt', outfitColor: '#ec4899', hat: 'none', accessory: 'none', background: '#fde68a' },
  defaultAvatar(1),
);
const SKINS = SKIN_TONES.map((t) => t.id);
type Slot = keyof typeof PARTS_BY_SLOT;
const LOTS: Record<string, Slot[]> = {
  tenues: ['body'],
  deguisements: ['costume'],
  tetes: ['hat', 'hair'],
  objets: ['face', 'back', 'held', 'accessory'],
};
const SLOT_FIELD: Record<Slot, keyof AvatarConfig> = {
  body: 'outfit', costume: 'costume', hat: 'hat', hair: 'hair', face: 'face', back: 'back', held: 'held', accessory: 'accessory', eyes: 'eyes', mouth: 'mouth',
};
function configWith(slot: Slot, id: string): AvatarConfig {
  return { ...DEMO, [SLOT_FIELD[slot]]: id };
}
const VARIANTS: { label: string; config: AvatarConfig }[] = [
  { label: 'T-shirt rose, couettes', config: DEMO },
  { label: 'Sweat bleu, cheveux courts', config: { ...DEMO, skin: 'skin-2', hair: 'hair-short', hairColor: '#e8c267', outfit: 'outfit-hoodie', outfitColor: '#3b82f6', eyes: 'eyes-round' } },
  { label: 'Robe violette, cheveux longs', config: { ...DEMO, skin: 'skin-5', hair: 'hair-long', hairColor: '#2b2118', outfit: 'outfit-dress', outfitColor: '#8b5cf6', eyes: 'eyes-happy' } },
];

/**
 * Labo de la chambre (parents, développement seulement) : la direction A (2,5D douce, vue de face) fermée puis armoire
 * ouverte, et le corps « enfant » en grand. Rien ici ne touche la vraie chambre.
 */
@Component({
  selector: 'app-lab-page',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Labo : la chambre</h1>
    <p class="intro">
      Planches de pièces sur le corps « enfant » (?lot=tenues, deguisements, tetes ou objets). La chambre est sur /chambre/:id.
    </p>

    @if (sheet().length) {
      <section class="direction" id="planche">
        <h2>Planche : {{ lot }}</h2>
        <div class="sheet">
          @for (p of sheet(); track p.key) {
            <figure>
              <app-avatar [config]="p.config" [size]="110" [full]="true" [round]="false" label="" />
              <figcaption>{{ p.label }}</figcaption>
            </figure>
          }
        </div>
      </section>
    }

    <section class="direction" id="corps">
      <h2>Le corps « enfant »</h2>
      <p>
        Même corps pour tout le monde, un seul dessin : le buste affiché ailleurs sera un recadrage du personnage entier.
      </p>
      <div class="body-row">
        @for (v of variants; track v.label) {
          <figure>
            <app-avatar [config]="v.config" [size]="200" [full]="true" [round]="false" [label]="v.label" />
            <figcaption>{{ v.label }}</figcaption>
          </figure>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      max-width: 1100px;
      margin: 0 auto;
      padding: 12px 16px 48px;
    }
    h1 {
      font: var(--mat-sys-headline-medium);
      margin: 8px 0;
    }
    .intro,
    .direction > p {
      max-width: 70ch;
      color: var(--mat-sys-on-surface-variant);
    }
    .direction {
      margin: 28px 0;
    }
    figure {
      margin: 0;
    }
    figcaption {
      margin-top: 4px;
      font: var(--mat-sys-label-large);
      text-align: center;
    }
    .room,
    .figure {
      display: block;
      width: 100%;
      height: auto;
      background: #fde4d2;
    }
    .sheet {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }
    .sheet figcaption {
      font: var(--mat-sys-label-small);
    }
    .figure {
      border-radius: 18px;
      box-shadow: var(--mat-sys-level2);
    }
    .body-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 900px) {
      .scenes {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class LabPage {
  protected readonly demo = DEMO;
  protected readonly variants = VARIANTS;
  /** Planche de pièces sur le corps (?lot=tenues|deguisements|tetes|objets), pour vérifier une migration. */
  protected readonly lot = inject(ActivatedRoute).snapshot.queryParamMap.get('lot') ?? '';
  protected readonly sheet = () => {
    if (this.lot === 'peaux') {
      return SKINS.flatMap((skin) => [{ key: skin + 't', label: skin + ' t-shirt', config: { ...DEMO, skin } }, { key: skin + 'r', label: skin + ' robe', config: { ...DEMO, skin, outfit: 'outfit-dress', costume: 'none' } }]);
    }
    const slots = LOTS[this.lot] ?? [];
    return slots.flatMap((slot) =>
      PARTS_BY_SLOT[slot].map((part) => ({
        key: slot + part.id,
        label: part.label,
        config: configWith(slot, part.id),
      })),
    );
  };
}
