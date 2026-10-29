import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { AvatarConfig, normalizeAvatar, defaultAvatar } from '../../avatar/avatar-config';
import { SvgShapes } from '../../shared/svg/svg-shapes';
import { LabDefs } from './lab-defs';
import { ParticlesScope, SeasonParticles } from '../../theme/season-particles';
import { LabFigure } from './lab-body';
import { RoomModel, buildRoom } from './lab-rooms';

const DEMO: AvatarConfig = normalizeAvatar(
  { version: 2, skin: 'skin-3', eyes: 'eyes-happy', eyeColor: '#5d4037', mouth: 'mouth-grin', hair: 'hair-ponytail', hairColor: '#6b3e26', outfit: 'outfit-tshirt', outfitColor: '#ec4899', hat: 'none', accessory: 'none', background: '#fde68a' },
  defaultAvatar(1),
);
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
  imports: [SvgShapes, LabDefs, LabFigure, SeasonParticles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Labo : la chambre</h1>
    <p class="intro">
      Direction A (2,5D douce, vue de face) et corps « enfant ». Rien n'est appliqué à la vraie chambre.
    </p>

    <section class="direction" id="dir-A">
      <h2>Chambre</h2>
      <div class="scenes">
        @for (s of scenes; track s.label) {
          <figure>
            <div class="frame">
              <svg class="room" viewBox="0 0 1000 430" role="img" [attr.aria-label]="s.label">
                <defs labDefs></defs>
                @for (layer of model(s.open).layers; track $index) {
                  @if (layer.figure) {
                    <g labFigure [config]="demo" [attr.transform]="layer.transform"></g>
                  } @else {
                    <g [attr.filter]="layer.filter ? 'url(#' + layer.filter + ')' : null" [attr.transform]="layer.transform ?? null" [attr.clip-path]="layer.clip ? 'url(#' + layer.clip + ')' : null" [appShapes]="layer.shapes"></g>
                  }
                }
              </svg>
              <app-season-particles />
            </div>
            <figcaption>{{ s.label }}</figcaption>
          </figure>
        }
      </div>
    </section>

    <section class="direction" id="corps">
      <h2>Le corps « enfant »</h2>
      <p>
        Même corps pour tout le monde, un seul dessin : le buste affiché ailleurs sera un recadrage du personnage entier.
      </p>
      <div class="body-row">
        @for (v of variants; track v.label) {
          <figure>
            <svg viewBox="0 0 200 300" class="figure" role="img" [attr.aria-label]="v.label">
              <defs labDefs></defs>
              <rect width="200" height="300" rx="14" fill="#fde8d8" />
              <g labFigure [config]="v.config"></g>
            </svg>
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
    .scenes {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .frame {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      box-shadow: var(--mat-sys-level2);
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
  protected readonly scenes: { label: string; open: boolean }[] = [
    { label: 'Chambre fermée', open: false },
    { label: 'Armoire ouverte', open: true },
  ];

  constructor() {
    // les particules du thème restent dans les scènes, pas dans les marges de la page
    inject(DestroyRef).onDestroy(inject(ParticlesScope).hostParticles());
  }

  private readonly cache = new Map<boolean, RoomModel>();
  protected model(open: boolean): RoomModel {
    let m = this.cache.get(open);
    if (!m) {
      m = buildRoom({ armoireOpen: open });
      this.cache.set(open, m);
    }
    return m;
  }
}
