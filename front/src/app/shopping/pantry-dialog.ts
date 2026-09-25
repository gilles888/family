import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { GardeMangerService, PantryItemDTO } from '../api-client';

/**
 * Garde-manger : ce qu'on a toujours à la maison, marqué « déjà à la maison » à la génération de la liste.
 * La page recharge la liste à la fermeture (un ajout marque aussi les lignes existantes).
 */
@Component({
  selector: 'app-pantry-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatListModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title i18n="@@pantry.title">Garde-manger</h2>
    <mat-dialog-content>
      <p class="hint" i18n="@@pantry.hint">
        Ce que vous avez toujours à la maison : ces ingrédients arrivent « déjà à la maison » dans la liste de courses.
      </p>
      <form class="add" (submit)="$event.preventDefault(); add(input)">
        <mat-form-field subscriptSizing="dynamic">
          <mat-label i18n="@@pantry.addLabel">Ajouter un ingrédient</mat-label>
          <input #input matInput maxlength="100" autocomplete="off" />
        </mat-form-field>
        <button type="submit" matIconButton i18n-aria-label="@@common.add" aria-label="Ajouter">
          <mat-icon>add</mat-icon>
        </button>
      </form>
      @if (items.hasValue()) {
        @if (items.value().length === 0) {
          <p class="hint" i18n="@@pantry.empty">Le garde-manger est vide.</p>
        } @else {
          <mat-list>
            @for (p of items.value(); track p.id) {
              <mat-list-item>
                <span matListItemTitle>{{ p.nom }}</span>
                <button
                  matListItemMeta
                  matIconButton
                  (click)="remove(p)"
                  i18n-aria-label="@@pantry.remove"
                  aria-label="Retirer du garde-manger"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </mat-list-item>
            }
          </mat-list>
        }
      } @else if (items.error()) {
        <p class="hint" i18n="@@pantry.loadError">Impossible de charger le garde-manger.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close i18n="@@common.close">Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .hint {
      margin: 0 0 8px;
      color: var(--mat-sys-on-surface-variant);
    }
    .add {
      display: flex;
      align-items: center;
      gap: 4px;

      mat-form-field {
        flex: 1;
      }
    }
  `,
})
export class PantryDialog {
  private readonly api = inject(GardeMangerService);

  protected readonly items = rxResource<PantryItemDTO[], void>({ stream: () => this.api.listGardeManger() });

  protected add(input: HTMLInputElement): void {
    const nom = input.value.trim();
    if (!nom) {
      return;
    }
    this.api.addGardeManger({ nom }).subscribe(() => {
      input.value = '';
      this.items.reload();
    });
  }

  protected remove(item: PantryItemDTO): void {
    this.api.deleteGardeManger(item.id!).subscribe({ complete: () => this.items.reload(), error: () => this.items.reload() });
  }
}
