import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FamilyMemberDTO, MembresService } from '../api-client';
import { AvatarConfig, defaultAvatar, normalizeAvatar, randomAvatar } from './avatar-config';
import { WARDROBE, WardrobeCategory, WardrobeOption } from './avatar-wardrobe';
import { Avatar } from './avatar';

export interface AvatarEditorData {
  member: FamilyMemberDTO;
}

/** Réduction des animations demandée par le système. */
function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Éditeur de personnage (« poupée à habiller ») : grand aperçu, garde-robe en onglets, vignettes et pastilles.
 * Un tap sur une option l'applique tout de suite. Se ferme avec le membre mis à jour si l'avatar est enregistré.
 */
@Component({
  selector: 'app-avatar-editor',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar-editor.html',
  styleUrl: './avatar-editor.scss',
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
    this.config.update((c) => option.apply(c));
    this.pop();
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
