import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { debounceTime } from 'rxjs';
import { RecettesService, RecipeSummaryDTO } from '../api-client';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { NotificationService } from '../shared/notification.service';
import { RecipeDialog, RecipeDialogData } from './recipe-dialog';

/** Recettes types de la famille : recherche, ajout, modification, suppression. */
@Component({
  selector: 'app-recipes-page',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatListModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipes-page.html',
  styleUrl: './recipes-page.scss',
})
export class RecipesPage {
  private readonly api = inject(RecettesService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  protected readonly query = signal('');
  private readonly debouncedQuery = toSignal(toObservable(this.query).pipe(debounceTime(250)), { initialValue: '' });

  protected readonly recipes = rxResource<RecipeSummaryDTO[], string>({
    params: () => this.debouncedQuery().trim(),
    stream: ({ params }) => this.api.listRecettes(params || undefined),
  });

  protected create(): void {
    this.openDialog({});
  }

  protected edit(recipe: RecipeSummaryDTO): void {
    this.api.getRecette(recipe.id!).subscribe({
      next: (full) => this.openDialog({ recipe: full }),
      error: () => this.recipes.reload(), // message affiché par l'intercepteur ; la recette a peut-être disparu
    });
  }

  private openDialog(data: RecipeDialogData): void {
    this.dialog
      .open(RecipeDialog, { data, width: '720px', maxWidth: '95vw', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((saved) => saved && this.recipes.reload());
  }

  protected remove(recipe: RecipeSummaryDTO): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: $localize`:@@recipe.deleteTitle:Supprimer la recette ?`,
          message: $localize`:@@recipe.deleteMessage:« ${recipe.nom}:name: » sera supprimée. Les repas déjà planifiés avec cette recette sont conservés, avec son nom.`,
          confirmLabel: $localize`:@@common.delete:Supprimer`,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.api.deleteRecette(recipe.id!).subscribe({
            next: () => this.notifications.success($localize`:@@recipe.deleted:Recette supprimée.`),
            error: () => this.recipes.reload(),
            complete: () => this.recipes.reload(),
          });
        }
      });
  }
}
