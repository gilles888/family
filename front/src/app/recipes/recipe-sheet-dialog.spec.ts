import { TestBed } from '@angular/core/testing';
import { HttpContext } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { MealDTO, RecettesService, RecipeSheetDTO } from '../api-client';
import { SKIP_ERROR_NOTIFICATION } from '../shared/api-error.interceptor';
import { RecipeSheetDialog, RecipeSheetDialogData } from './recipe-sheet-dialog';

const fiche = (portions: number): RecipeSheetDTO => ({
  id: 1,
  nom: 'Crêpes',
  portionsRecette: 4,
  portions,
  tempsPreparation: 20,
  instructions: 'Mélanger.\n\n  Cuire.  ',
  ingredients: [{ ingredientId: 1, nom: 'Farine', quantite: (250 * portions) / 4, unite: 'G' }],
});

async function render(data: RecipeSheetDialogData) {
  const getFicheRecette = vi.fn((_id: number, portions?: number) => of(fiche(portions ?? 4)));
  TestBed.configureTestingModule({
    providers: [
      { provide: RecettesService, useValue: { getFicheRecette } },
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(RecipeSheetDialog);
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, fixture, getFicheRecette };
}

describe('RecipeSheetDialog', () => {
  it('demande la fiche pour les portions du repas et affiche les quantités recalculées', async () => {
    const meal: MealDTO = { id: 3, recetteId: 1, portions: 6, titre: 'Crêpes' };
    const { el, getFicheRecette } = await render({ recipeId: 1, portions: 6, meal });

    const [id, portions, , , options] = getFicheRecette.mock.calls[0] as unknown as [number, number, string, boolean, { context: HttpContext }];
    expect([id, portions]).toEqual([1, 6]);
    expect(options.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
    expect(el.querySelector('.ingredients li')!.textContent).toContain('375');
    expect(el.querySelector('.hint')!.textContent).toContain('4');
    expect([...el.querySelectorAll('.steps li')].map((li) => li.textContent!.trim())).toEqual(['Mélanger.', 'Cuire.']);
    expect(el.textContent).toContain('Modifier le repas');
  });

  it('recharge la fiche quand on ajoute une portion', async () => {
    const { el, fixture, getFicheRecette } = await render({ recipeId: 1 });

    (el.querySelector('button[aria-label="Une portion de plus"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getFicheRecette.mock.calls.at(-1)![1]).toBe(5);
    expect(el.querySelector('.count')!.textContent).toContain('5');
    expect(el.textContent).not.toContain('Modifier le repas');
  });
});
