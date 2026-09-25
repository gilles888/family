import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ShoppingItemDTO, ShoppingListDTO } from '../api-client';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { addDays, parseIsoDate, startOfDay } from '../shared/date-utils';
import { EnumLabelPipe } from '../shared/enum-label.pipe';
import { AISLE_LABELS, INGREDIENT_UNITS } from '../shared/labels';
import { NotificationService } from '../shared/notification.service';
import { PantryDialog } from './pantry-dialog';
import { ShoppingItemDialog } from './shopping-item-dialog';
import { shoppingItemForm, toRequest } from './shopping-item-form';
import { groupByAisle } from './shopping-list';
import { ShoppingSources } from './shopping-sources';
import { ShoppingStore } from './shopping-store';

/** Période proposée par défaut : aujourd'hui et les 7 jours suivants. */
const DEFAULT_DAYS = 7;

/**
 * Liste de courses, pensée d'abord pour le téléphone en magasin : grandes lignes à cocher, ajout rapide en haut,
 * regroupement par rayon. La liste se génère depuis les repas d'une période et se complète à la main.
 */
@Component({
  selector: 'app-shopping-page',
  imports: [
    DecimalPipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSelectModule,
    EnumLabelPipe,
    ShoppingSources,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shopping-page.html',
  styleUrl: './shopping-page.scss',
})
export class ShoppingPage {
  protected readonly store = inject(ShoppingStore);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly locale = inject(LOCALE_ID);

  protected readonly list = this.store.list;
  protected readonly units = INGREDIENT_UNITS;
  protected readonly aisleLabels = AISLE_LABELS;

  protected readonly period = new FormGroup({
    from: new FormControl<Date | null>(null, Validators.required),
    to: new FormControl<Date | null>(null, Validators.required),
  });
  protected readonly generating = signal(false);

  protected readonly addForm = shoppingItemForm();
  /** Quantité et unité de l'ajout rapide : repliées par défaut. */
  protected readonly addDetails = signal(false);
  protected readonly adding = signal(false);

  /** Articles à acheter (cochés compris, barrés), par rayon. */
  protected readonly groups = computed(() => groupByAisle(this.store.items().filter((i) => !i.aLaMaison), this.locale));
  /** « Déjà à la maison » : section repliée, sans regroupement par rayon. */
  protected readonly atHome = computed(() =>
    groupByAisle(this.store.items().filter((i) => i.aLaMaison), this.locale).flatMap((g) => g.items),
  );
  protected readonly showAtHome = signal(false);

  constructor() {
    // Données fraîches à chaque visite (la liste a pu changer sur un autre appareil)
    if (this.list.hasValue()) {
      this.list.reload();
    }
    this.setPeriod(undefined);
    // Dès que la liste est connue, on propose sa période (sauf si l'utilisateur a déjà changé les dates)
    let fromList = false;
    effect(() => {
      const list = this.list.hasValue() ? this.list.value() : undefined;
      if (list && !fromList) {
        fromList = true;
        untracked(() => this.period.pristine && this.setPeriod(list));
      }
    });
  }

  /** Période de la dernière génération si elle n'est pas passée, sinon aujourd'hui → +7 jours. */
  private setPeriod(list: ShoppingListDTO | undefined): void {
    const today = startOfDay(new Date());
    const end = list?.dateFin ? parseIsoDate(list.dateFin) : undefined;
    const usable = !!list?.dateDebut && !!end && end >= today;
    this.period.setValue({
      from: usable ? parseIsoDate(list!.dateDebut!) : today,
      to: usable ? end! : addDays(today, DEFAULT_DAYS),
    });
  }

  // ---------- génération

  protected generate(): void {
    const { from, to } = this.period.getRawValue();
    if (this.period.invalid || !from || !to) {
      this.period.markAllAsTouched();
      return;
    }
    this.generating.set(true);
    this.store.generate(from, to).subscribe({
      next: (list) =>
        this.notifications.success(
          $localize`:@@shopping.generated:Liste mise à jour : ${list.articles?.length ?? 0}:count: article(s).`,
        ),
      error: () => this.generating.set(false),
      complete: () => this.generating.set(false),
    });
  }

  // ---------- ajout rapide

  protected add(input: HTMLInputElement, formDir: FormGroupDirective): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.adding.set(true);
    this.store.add(toRequest(this.addForm)).subscribe({
      next: () => {
        // resetForm : efface aussi l'état « soumis » (sinon le champ vide s'afficherait en erreur)
        formDir.resetForm();
        input.focus(); // enchaîner les ajouts
      },
      error: () => this.adding.set(false),
      complete: () => this.adding.set(false),
    });
  }

  // ---------- lignes

  protected toggleBought(item: ShoppingItemDTO): void {
    this.store.setStatus(item, { achete: !item.achete });
  }

  protected setAtHome(item: ShoppingItemDTO, atHome: boolean): void {
    this.store.setStatus(item, { aLaMaison: atHome });
  }

  protected addToPantry(item: ShoppingItemDTO): void {
    this.store.addToPantry(item.nom!).subscribe(() =>
      this.notifications.success($localize`:@@shopping.addedToPantry:« ${item.nom}:name: » ajouté au garde-manger.`),
    );
  }

  protected edit(item: ShoppingItemDTO): void {
    this.dialog.open(ShoppingItemDialog, { data: item, width: '480px', maxWidth: '95vw' });
  }

  protected remove(item: ShoppingItemDTO): void {
    this.store.remove(item).subscribe({ error: () => this.list.reload() });
  }

  protected clearBought(): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: $localize`:@@shopping.clearTitle:Vider les articles achetés ?`,
          message: $localize`:@@shopping.clearMessage:Les ${this.store.boughtCount()}:count: article(s) coché(s) seront retirés de la liste. Les articles venant des repas ne reviendront pas à la prochaine génération.`,
          confirmLabel: $localize`:@@shopping.clearConfirm:Vider`,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => confirmed && this.store.clearBought().subscribe({ error: () => this.list.reload() }));
  }

  protected openPantry(): void {
    this.dialog
      .open(PantryDialog, { width: '480px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe(() => this.list.reload());
  }
}
