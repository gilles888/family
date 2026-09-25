import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FamilyMemberDTO, MembresService } from '../api-client';
import { AvatarConfig, defaultAvatar, normalizeAvatar, randomAvatar } from './avatar-config';
import { ACCESSORIES, DropZone, HATS, NONE, ZONES } from './avatar-parts';
import { WARDROBE, WardrobeCategory, WardrobeOption } from './avatar-wardrobe';
import { Avatar } from './avatar';

export interface AvatarEditorData {
  member: FamilyMemberDTO;
}

/** Ce qu'on glisse : une option de la garde-robe (vers le personnage) ou une pièce portée (vers la garde-robe). */
type DragData = { kind: 'option'; option: WardrobeOption } | { kind: 'worn'; field: 'hat' | 'accessory'; zone: DropZone };

/** Souris : le glisser commence tout de suite. Doigt : après un court appui (un balayage rapide fait défiler). */
const DRAG_DELAY = { touch: 180, mouse: 0 };

/** Position CSS (en %) d'une zone du personnage. */
function zoneStyle(zone: DropZone): Record<string, string> {
  const [x, y, w, h] = ZONES[zone];
  return { left: `${x / 2}%`, top: `${y / 2}%`, width: `${w / 2}%`, height: `${h / 2}%` };
}

/** Réduction des animations demandée par le système. */
function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Éditeur de personnage (« poupée à habiller ») : grand aperçu, garde-robe en onglets, vignettes et pastilles.
 * Deux façons de poser une pièce : tap sur l'option, ou glisser-déposer sur le personnage (CDK DragDrop : souris,
 * doigt et stylet) où elle s'aimante à sa zone. Le chapeau et l'accessoire portés se retirent en les glissant vers
 * la garde-robe (ou avec l'option « aucun »). Le glisser est un bonus : tout se fait aussi au tap et au clavier.
 * Se ferme avec le membre mis à jour si l'avatar est enregistré.
 */
@Component({
  selector: 'app-avatar-editor',
  imports: [CdkDrag, CdkDragPlaceholder, CdkDragPreview, CdkDropList, MatButtonModule, MatDialogModule, MatIconModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar-editor.html',
  styleUrls: ['./avatar-editor.scss', './avatar-editor-drag.scss'],
})
export class AvatarEditor {
  private readonly api = inject(MembresService);
  private readonly dialogRef = inject(MatDialogRef<AvatarEditor, FamilyMemberDTO>);
  protected readonly member = inject<AvatarEditorData>(MAT_DIALOG_DATA).member;

  private readonly preview = viewChild.required<ElementRef<HTMLElement>>('preview');

  protected readonly categories = WARDROBE;
  protected readonly category = signal<WardrobeCategory>(WARDROBE[0]);
  protected readonly config = signal<AvatarConfig>(
    normalizeAvatar(this.member.avatarConfig, defaultAvatar(this.member.id ?? 0, this.member.couleur)),
  );
  protected readonly saving = signal(false);

  // ---------- glisser-déposer
  protected readonly dragDelay = DRAG_DELAY;
  protected readonly zoneStyle = zoneStyle;

  /** Cadrage carré centré sur une zone (aperçu de la pièce qu'on retire). */
  protected zoneViewBox(zone: DropZone): string {
    const [x, y, w, h] = ZONES[zone];
    const side = Math.max(w, h) + 16;
    return `${x + w / 2 - side / 2} ${y + h / 2 - side / 2} ${side} ${side}`;
  }
  /** Pièce en cours de glisser (zone surlignée sur le personnage). */
  protected readonly dragged = signal<DragData | null>(null);
  protected readonly overStage = signal(false);
  /** Un « clic » suit parfois la fin d'un glisser : il ne doit pas appliquer l'option une seconde fois. */
  private lastDragEnd = 0;

  /** Personnage affiché : la pièce qu'on est en train de retirer n'est plus portée. */
  protected readonly shown = computed(() => {
    const dragged = this.dragged();
    return dragged?.kind === 'worn' ? { ...this.config(), [dragged.field]: NONE } : this.config();
  });

  /** Pièces retirables en les glissant : chapeau et accessoire portés, chacun sur sa zone. */
  protected readonly worn = computed<Extract<DragData, { kind: 'worn' }>[]>(() => {
    const config = this.config();
    const worn: Extract<DragData, { kind: 'worn' }>[] = [];
    if (config.hat !== NONE) {
      worn.push({ kind: 'worn', field: 'hat', zone: 'hat' });
    }
    const accessory = ACCESSORIES.find((a) => a.id === config.accessory);
    if (accessory && accessory.id !== NONE) {
      worn.push({ kind: 'worn', field: 'accessory', zone: accessory.zone ?? 'face' });
    }
    return worn;
  });

  /** Ids des listes de la garde-robe (onglet affiché), reliées au personnage. */
  protected readonly groupListIds = computed(() => this.category().groups.map((g) => `wardrobe-${g.id}`));

  protected readonly wornLabels: Record<'hat' | 'accessory', string> = {
    hat: HATS[0].label,
    accessory: ACCESSORIES[0].label,
  };

  /** Le personnage n'accepte que les options de la garde-robe. */
  protected readonly acceptOption = (drag: CdkDrag<DragData>) => drag.data?.kind === 'option';
  /** La garde-robe n'accepte que les pièces portées (retrait). */
  protected readonly acceptWorn = (drag: CdkDrag<DragData>) => drag.data?.kind === 'worn';

  /** Config de chaque vignette : le personnage actuel avec cette option (on voit le résultat avant de choisir). */
  protected readonly thumbs = computed(() => {
    const config = this.config();
    return new Map(
      this.category()
        .groups.flatMap((g) => g.options)
        .map((o) => [o.key, o.apply(config)] as const),
    );
  });

  protected select(option: WardrobeOption): void {
    if (Date.now() - this.lastDragEnd < 350) {
      return;
    }
    this.config.update((c) => option.apply(c));
    this.pop();
  }

  protected dragStarted(data: DragData): void {
    this.dragged.set(data);
  }

  protected dragEnded(): void {
    this.dragged.set(null);
    this.overStage.set(false);
    this.lastDragEnd = Date.now();
  }

  /**
   * Option lâchée sur le personnage : elle s'aimante à sa zone (animation du CDK), puis s'applique.
   * Lâchée hors du personnage : elle revient dans la garde-robe, rien ne change.
   */
  protected dropOnStage(event: CdkDragDrop<unknown, unknown, DragData>): void {
    const data = event.item.data;
    // isPointerOverContainer : le CDK garde la dernière liste survolée, même si on lâche ailleurs ensuite
    if (data.kind === 'option' && event.previousContainer !== event.container && event.isPointerOverContainer) {
      this.config.update((c) => data.option.apply(c));
      this.pop();
    }
  }

  /** Pièce portée lâchée dans la garde-robe : retirée. Lâchée ailleurs : elle revient sur le personnage. */
  protected dropInWardrobe(event: CdkDragDrop<unknown, unknown, DragData>): void {
    const data = event.item.data;
    if (data.kind === 'worn' && event.previousContainer !== event.container && event.isPointerOverContainer) {
      this.config.update((c) => ({ ...c, [data.field]: NONE }));
      this.pop();
    }
  }

  protected surprise(): void {
    this.config.set(randomAvatar());
    this.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-8deg) scale(0.92)' }, { transform: 'rotate(6deg) scale(1.05)' }, { transform: 'rotate(0) scale(1)' }], 450);
  }

  protected save(): void {
    this.saving.set(true);
    this.api.updateAvatarMembre(this.member.id!, { ...this.config() }).subscribe({
      next: (member) => {
        // Petit rebond de joie, puis fermeture
        const done = () => this.dialogRef.close(member);
        const animation = this.animate(
          [
            { transform: 'translateY(0) scale(1)' },
            { transform: 'translateY(-18px) scale(1.06)' },
            { transform: 'translateY(0) scale(0.97)' },
            { transform: 'translateY(-6px) scale(1.02)' },
            { transform: 'translateY(0) scale(1)' },
          ],
          550,
        );
        if (animation) {
          animation.onfinish = done;
        } else {
          done();
        }
      },
      error: () => this.saving.set(false), // message affiché par l'intercepteur
    });
  }

  /** Retour visuel immédiat quand une pièce est posée. */
  protected pop(): void {
    this.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], 220);
  }

  private animate(keyframes: Keyframe[], duration: number): Animation | undefined {
    if (reducedMotion()) {
      return undefined;
    }
    return this.preview().nativeElement.animate(keyframes, { duration, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }
}
