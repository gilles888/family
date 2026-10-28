import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AvatarConfig, normalizeAvatar, defaultAvatar } from '../../avatar/avatar-config';
import { SvgShapes } from '../../shared/svg/svg-shapes';
import { LabDefs } from './lab-defs';
import { LabFigure, Proportion } from './lab-body';
import { Direction, RoomModel, buildRoom } from './lab-rooms';

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
 * Labo de la chambre (parents, développement seulement) : trois directions de style côte à côte, chacune fermée avec les
 * deux proportions de corps, puis l'armoire ouverte ; et les deux corps en grand. Rien ici ne touche la vraie chambre.
 */
@Component({
  selector: 'app-lab-page',
  imports: [SvgShapes, LabDefs, LabFigure],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Labo : la chambre</h1>
    <p class="intro">
      Trois directions de style pour la même chambre et le même personnage, deux proportions de corps. Rien n'est appliqué à la vraie chambre.
    </p>

    @for (d of directions; track d.id) {
      <section class="direction" [id]="'dir-' + d.id">
        <h2>{{ d.title }}</h2>
        <p>{{ d.text }}</p>
        <div class="scenes">
          @for (s of scenes; track s.label) {
            <figure>
              <svg class="room" viewBox="0 0 1000 600" role="img" [attr.aria-label]="d.title + ' : ' + s.label">
                <defs labDefs></defs>
                @for (layer of model(d.id, s.open).layers; track $index) {
                  @if (layer.figure) {
                    <g labFigure [config]="demo" [proportion]="s.body" [attr.transform]="layer.transform"></g>
                  } @else {
                    <g [attr.filter]="layer.filter ? 'url(#' + layer.filter + ')' : null" [attr.transform]="layer.transform ?? null" [attr.clip-path]="layer.clip ? 'url(#' + layer.clip + ')' : null" [appShapes]="layer.shapes"></g>
                  }
                }
              </svg>
              <figcaption>{{ s.label }}</figcaption>
            </figure>
          }
        </div>
      </section>
    }

    <section class="direction" id="corps">
      <h2>Le corps du personnage</h2>
      <p>
        Même corps pour tout le monde, un seul dessin : le buste affiché ailleurs sera un recadrage du personnage entier. Têtes à ~40 %
        (chibi) et ~30 % (enfant) de la hauteur.
      </p>
      <div class="bodies">
        @for (p of proportions; track p.id) {
          <div class="body-group">
            <h3>{{ p.label }}</h3>
            <div class="body-row">
              @for (v of variants; track v.label) {
                <figure>
                  <svg viewBox="0 0 200 300" class="figure" role="img" [attr.aria-label]="p.label + ' : ' + v.label">
                    <defs labDefs></defs>
                    <rect width="200" height="300" rx="14" fill="#fde8d8" />
                    <g labFigure [config]="v.config" [proportion]="p.id"></g>
                  </svg>
                  <figcaption>{{ v.label }}</figcaption>
                </figure>
              }
            </div>
          </div>
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
    .scenes figure:first-child {
      grid-column: 1 / -1;
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
      border-radius: 18px;
      box-shadow: var(--mat-sys-level2);
      background: #fde4d2;
    }
    .bodies {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }
    .body-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 900px) {
      .scenes,
      .bodies {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class LabPage {
  protected readonly demo = DEMO;
  protected readonly variants = VARIANTS;
  protected readonly directions: { id: Direction; title: string; text: string }[] = [
    { id: 'A', title: 'A · 2,5D douce, vue de face', text: 'La chambre comme aujourd’hui, avec du volume : côtés et dessus des meubles, ombres douces au sol, ombres de coin, sol en perspective, lumière de la fenêtre.' },
    { id: 'B', title: 'B · Vue en coin (mur du fond + mur de gauche)', text: 'La pièce vue depuis un angle : un point de fuite, sol qui converge, meubles le long des deux murs.' },
    { id: 'C', title: 'C · Isométrique', text: 'Façon jeu (Animal Crossing, Habbo) : murs à 30°, meubles en volumes isométriques.' },
  ];
  protected readonly proportions: { id: Proportion; label: string }[] = [
    { id: 'chibi', label: 'Chibi (tête ≈ 40 %)' },
    { id: 'enfant', label: 'Enfant (tête ≈ 30 %)' },
  ];
  protected readonly scenes: { label: string; open: boolean; body: Proportion }[] = [
    { label: 'Chambre fermée · corps « enfant »', open: false, body: 'enfant' },
    { label: 'Chambre fermée · corps « chibi »', open: false, body: 'chibi' },
    { label: 'Armoire ouverte · corps « enfant »', open: true, body: 'enfant' },
  ];

  private readonly cache = new Map<string, RoomModel>();
  protected model(dir: Direction, open: boolean): RoomModel {
    const key = dir + open;
    let m = this.cache.get(key);
    if (!m) {
      m = buildRoom(dir, { armoireOpen: open });
      this.cache.set(key, m);
    }
    return m;
  }
}
